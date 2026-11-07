use crate::{ClaimStatus, Error, Looptag, LooptagClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, BytesN, Env, String,
};

struct Fixture {
    env: Env,
    contract_id: Address,
    admin: Address,
    issuer: Address,
    station: Address,
    customer: Address,
    token: Address,
}

impl Fixture {
    fn client(&self) -> LooptagClient<'_> {
        LooptagClient::new(&self.env, &self.contract_id)
    }

    fn serial(&self) -> BytesN<32> {
        BytesN::from_array(&self.env, &[7u8; 32])
    }

    fn balance(&self, who: &Address) -> i128 {
        TokenClient::new(&self.env, &self.token).balance(who)
    }

    fn issue(&self, owner: &Address, deposit: i128) -> u64 {
        self.client()
            .issue_claim(&self.issuer, owner, &self.serial(), &deposit, &0)
    }
}

fn setup() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);

    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let station = Address::generate(&env);
    let customer = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let token = sac.address();

    let contract_id = env.register(Looptag, ());
    let client = LooptagClient::new(&env, &contract_id);

    client.initialize(&admin, &token);
    client.register_merchant(&issuer, &String::from_str(&env, "Circular Cafe"));
    client.register_station(&issuer, &station);

    StellarAssetClient::new(&env, &token).mint(&issuer, &10_000);

    Fixture {
        env,
        contract_id,
        admin,
        issuer,
        station,
        customer,
        token,
    }
}

#[test]
fn issue_transfer_return_and_redeem_pays_current_owner() {
    let f = setup();
    let client = f.client();
    let friend = Address::generate(&f.env);

    let id = f.issue(&f.customer, 200);
    assert_eq!(id, 1);
    assert_eq!(client.get_claim_count(), 1);

    // The deposit moved from the issuer to the contract; the customer holds a
    // claim, not the funds.
    assert_eq!(f.balance(&f.issuer), 9_800);
    assert_eq!(f.balance(&f.customer), 0);
    assert_eq!(f.balance(&f.contract_id), 200);
    assert_eq!(client.get_outstanding_liability(&f.issuer), 200);

    let claim = client.get_claim(&id);
    assert_eq!(claim.owner, f.customer);
    assert_eq!(claim.status, ClaimStatus::Active);
    assert_eq!(claim.deposit, 200);
    assert_eq!(claim.serial_hash, f.serial());

    // The claim, and therefore the refund entitlement, follows the item.
    client.transfer_claim(&id, &f.customer, &friend);
    assert_eq!(client.get_claim(&id).owner, friend);
    assert_eq!(f.balance(&friend), 0);

    // An authorised station attests the physical return.
    client.authorize_return(&id, &f.station, &f.serial());
    let returned = client.get_claim(&id);
    assert_eq!(returned.status, ClaimStatus::ReturnAuthorized);
    assert_eq!(returned.return_station, Some(f.station.clone()));
    assert_eq!(returned.returned_at, 1_700_000_000);

    // Redemption is permissionless, but the refund goes to the current owner.
    client.redeem(&id);
    assert_eq!(f.balance(&friend), 200);
    assert_eq!(f.balance(&f.contract_id), 0);
    assert_eq!(client.get_outstanding_liability(&f.issuer), 0);

    let redeemed = client.get_claim(&id);
    assert_eq!(redeemed.status, ClaimStatus::Redeemed);

    let merchant = client.get_merchant(&f.issuer);
    assert_eq!(merchant.issued, 1);
    assert_eq!(merchant.redeemed, 1);
    assert_eq!(merchant.outstanding, 0);
}

#[test]
fn unauthorised_station_cannot_authorise_return() {
    let f = setup();
    let rogue = Address::generate(&f.env);
    let id = f.issue(&f.customer, 200);

    let result = f.client().try_authorize_return(&id, &rogue, &f.serial());
    assert_eq!(result, Err(Ok(Error::StationNotAuthorized)));
    assert_eq!(f.client().get_claim(&id).status, ClaimStatus::Active);
}

#[test]
fn revoked_station_cannot_authorise_return() {
    let f = setup();
    let id = f.issue(&f.customer, 200);

    f.client().remove_station(&f.issuer, &f.station);
    let result = f
        .client()
        .try_authorize_return(&id, &f.station, &f.serial());
    assert_eq!(result, Err(Ok(Error::StationNotAuthorized)));
}

#[test]
fn serial_mismatch_cannot_close_a_claim() {
    let f = setup();
    let id = f.issue(&f.customer, 200);
    let wrong = BytesN::from_array(&f.env, &[9u8; 32]);

    let result = f.client().try_authorize_return(&id, &f.station, &wrong);
    assert_eq!(result, Err(Ok(Error::SerialMismatch)));
}

#[test]
fn transfer_is_frozen_after_return_attestation() {
    let f = setup();
    let id = f.issue(&f.customer, 200);
    let other = Address::generate(&f.env);

    f.client().authorize_return(&id, &f.station, &f.serial());
    let result = f.client().try_transfer_claim(&id, &f.customer, &other);
    assert_eq!(result, Err(Ok(Error::ClaimNotActive)));
    assert_eq!(f.client().get_claim(&id).owner, f.customer);
}

#[test]
fn double_redeem_is_rejected() {
    let f = setup();
    let id = f.issue(&f.customer, 200);

    f.client().authorize_return(&id, &f.station, &f.serial());
    f.client().redeem(&id);
    let result = f.client().try_redeem(&id);
    assert_eq!(result, Err(Ok(Error::ClaimNotReturnAuthorized)));

    assert_eq!(f.balance(&f.customer), 200);
    assert_eq!(f.balance(&f.contract_id), 0);
}

#[test]
fn redeem_before_return_is_rejected() {
    let f = setup();
    let id = f.issue(&f.customer, 200);

    let result = f.client().try_redeem(&id);
    assert_eq!(result, Err(Ok(Error::ClaimNotReturnAuthorized)));
    assert_eq!(f.balance(&f.contract_id), 200);
}

#[test]
fn only_the_current_owner_can_transfer() {
    let f = setup();
    let id = f.issue(&f.customer, 200);
    let stranger = Address::generate(&f.env);

    let result = f.client().try_transfer_claim(&id, &stranger, &f.customer);
    assert_eq!(result, Err(Ok(Error::NotClaimOwner)));
    assert_eq!(f.client().get_claim(&id).owner, f.customer);
}

#[test]
fn merchant_suspension_blocks_new_claims_but_not_existing_refunds() {
    let f = setup();
    let id = f.issue(&f.customer, 200);

    f.client().set_merchant_active(&f.issuer, &false);
    let blocked = f
        .client()
        .try_issue_claim(&f.issuer, &f.customer, &f.serial(), &100, &0);
    assert_eq!(blocked, Err(Ok(Error::MerchantInactive)));

    // Suspension must not strand an existing deposit.
    f.client().authorize_return(&id, &f.station, &f.serial());
    f.client().redeem(&id);
    assert_eq!(f.balance(&f.customer), 200);
}

#[test]
fn unregistered_merchant_cannot_issue() {
    let f = setup();
    let stranger = Address::generate(&f.env);

    let result = f
        .client()
        .try_issue_claim(&stranger, &f.customer, &f.serial(), &100, &0);
    assert_eq!(result, Err(Ok(Error::MerchantNotFound)));
}

#[test]
fn zero_and_negative_deposits_are_rejected() {
    let f = setup();
    let client = f.client();

    assert_eq!(
        client.try_issue_claim(&f.issuer, &f.customer, &f.serial(), &0, &0),
        Err(Ok(Error::InvalidDeposit))
    );
    assert_eq!(
        client.try_issue_claim(&f.issuer, &f.customer, &f.serial(), &-1, &0),
        Err(Ok(Error::InvalidDeposit))
    );
}

#[test]
fn expiry_in_the_past_is_rejected() {
    let f = setup();
    let past = 1_699_999_999;

    let result = f
        .client()
        .try_issue_claim(&f.issuer, &f.customer, &f.serial(), &100, &past);
    assert_eq!(result, Err(Ok(Error::InvalidExpiry)));
}

#[test]
fn outstanding_liability_tracks_multiple_claims() {
    let f = setup();
    let a = Address::generate(&f.env);
    let b = Address::generate(&f.env);

    f.issue(&f.customer, 200);
    f.issue(&a, 350);
    let id_c = f.issue(&b, 50);

    assert_eq!(f.client().get_claim_count(), 3);
    assert_eq!(f.client().get_outstanding_liability(&f.issuer), 600);
    assert_eq!(f.balance(&f.contract_id), 600);

    f.client().authorize_return(&id_c, &f.station, &f.serial());
    f.client().redeem(&id_c);

    assert_eq!(f.client().get_outstanding_liability(&f.issuer), 550);
    assert_eq!(f.balance(&f.contract_id), 550);
    assert_eq!(f.balance(&b), 50);
}

#[test]
fn uninitialised_contract_rejects_reads_and_writes() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Looptag, ());
    let client = LooptagClient::new(&env, &contract_id);
    let who = Address::generate(&env);

    assert_eq!(client.try_get_admin(), Err(Ok(Error::NotInitialized)));
    assert_eq!(
        client.try_register_merchant(&who, &String::from_str(&env, "x")),
        Err(Ok(Error::NotInitialized))
    );
}

#[test]
fn admin_and_token_are_exposed_for_indexers() {
    let f = setup();
    assert_eq!(f.client().get_admin(), f.admin);
    assert_eq!(f.client().get_deposit_token(), f.token);
}
