import { CryptoService } from "../../../platform/abstractions/crypto.service";
import { EncString } from "../../../platform/models/domain/enc-string";
import { SymmetricCryptoKey } from "../../../platform/models/domain/symmetric-crypto-key";
import { OrgKey } from "../../../types/key";
import { EncryptedOrganizationKeyData } from "../data/encrypted-organization-key.data";

export abstract class BaseEncryptedOrganizationKey {
  decrypt: (cryptoService: CryptoService) => Promise<SymmetricCryptoKey>;

  static fromData(data: EncryptedOrganizationKeyData) {
    switch (data.type) {
      case "organization":
        return new EncryptedOrganizationKey(data.key);

      case "provider":
        return new ProviderEncryptedOrganizationKey(data.key, data.providerId);

      default:
        return null;
    }
  }
}

export class EncryptedOrganizationKey implements BaseEncryptedOrganizationKey {
  constructor(private key: string) {}

  async decrypt(cryptoService: CryptoService) {
    const activeUserPrivateKey = await cryptoService.getPrivateKey();

    if (activeUserPrivateKey == null) {
      throw new Error("Active user does not have a private key, cannot decrypt organization key.");
    }

    const decValue = await cryptoService.rsaDecrypt(this.key, activeUserPrivateKey);
    return new SymmetricCryptoKey(decValue) as OrgKey;
  }

  toData(): EncryptedOrganizationKeyData {
    return {
      type: "organization",
      key: this.key,
    };
  }
}

export class ProviderEncryptedOrganizationKey implements BaseEncryptedOrganizationKey {
  constructor(
    private key: string,
    private providerId: string,
  ) {}

  async decrypt(cryptoService: CryptoService) {
    const providerKey = await cryptoService.getProviderKey(this.providerId);
    const decValue = await cryptoService.decryptToBytes(new EncString(this.key), providerKey);
    return new SymmetricCryptoKey(decValue) as OrgKey;
  }

  toData(): EncryptedOrganizationKeyData {
    return {
      type: "provider",
      key: this.key,
      providerId: this.providerId,
    };
  }
}
