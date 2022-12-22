import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { createMockClient } from '@apollo/client/testing';
import { CreateProfileDocument, RelayErrorReasons } from '@lens-protocol/api';
import {
  mockRelayerResultFragment,
  mockCreateProfileMutation,
  mockRelayErrorFragment,
} from '@lens-protocol/api/mocks';
import { NativeTransaction, TransactionError } from '@lens-protocol/domain/entities';
import { mockCreateProfileRequest } from '@lens-protocol/domain/mocks';
import { DuplicatedHandleError } from '@lens-protocol/domain/use-cases/profile';
import { ChainType } from '@lens-protocol/shared-kernel';

import { mockITransactionFactory } from '../../../transactions/adapters/__helpers__/mocks';
import { ProfileTransactionGateway } from '../ProfileTransactionGateway';

function setupProfileTransactionGateway({
  apollo,
}: {
  apollo: ApolloClient<NormalizedCacheObject>;
}) {
  const factory = mockITransactionFactory();
  return new ProfileTransactionGateway(apollo, factory);
}

describe(`Given an instance of the ${ProfileTransactionGateway.name}`, () => {
  describe(`when calling the "${ProfileTransactionGateway.prototype.createProfileTransaction.name}" method`, () => {
    it(`should create the expected "${NativeTransaction.name}"`, async () => {
      const request = mockCreateProfileRequest();
      const relayerResult = mockRelayerResultFragment();
      const createProfileResult = mockCreateProfileMutation(relayerResult);

      const apollo = createMockClient(createProfileResult, CreateProfileDocument, {
        request: {
          handle: request.handle,
        },
      });

      const profileTransactionGateway = setupProfileTransactionGateway({ apollo });

      const result = await profileTransactionGateway.createProfileTransaction(request);
      const transaction = result.unwrap();
      await transaction.waitNextEvent();

      expect(result.unwrap()).toBeInstanceOf(NativeTransaction);
      expect(result.unwrap()).toEqual(
        expect.objectContaining({
          chainType: ChainType.POLYGON,
          hash: relayerResult.txHash,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          id: expect.any(String),
          request,
        }),
      );
    });

    it(`should fail w/ a "${DuplicatedHandleError.name}" in case of duplicated handle response`, async () => {
      const request = mockCreateProfileRequest();
      const createProfileResult = mockCreateProfileMutation(
        mockRelayErrorFragment(RelayErrorReasons.HandleTaken),
      );

      const apollo = createMockClient(createProfileResult, CreateProfileDocument, {
        request: {
          handle: request.handle,
        },
      });
      const profileTransactionGateway = setupProfileTransactionGateway({ apollo });

      const result = await profileTransactionGateway.createProfileTransaction(request);

      expect(() => result.unwrap()).toThrow(DuplicatedHandleError);
    });

    it(`should propagate any other relay error as transaction event error scenario`, async () => {
      const request = mockCreateProfileRequest();
      const createProfileResult = mockCreateProfileMutation(
        mockRelayErrorFragment(RelayErrorReasons.Rejected),
      );

      const apollo = createMockClient(createProfileResult, CreateProfileDocument, {
        request: {
          handle: request.handle,
        },
      });
      const profileTransactionGateway = setupProfileTransactionGateway({ apollo });

      const result = await profileTransactionGateway.createProfileTransaction(request);
      const transaction = result.unwrap();
      const eventResult = await transaction.waitNextEvent();

      expect(() => eventResult.unwrap()).toThrow(TransactionError);
    });
  });
});