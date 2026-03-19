import { safeStorage } from "electron";
import type { TokenCipher } from "./configStore";

export const electronTokenCipher: TokenCipher = {
  isAvailable() {
    return safeStorage.isEncryptionAvailable();
  },

  encrypt(value) {
    return safeStorage.encryptString(value).toString("base64");
  },

  decrypt(value) {
    return safeStorage.decryptString(Buffer.from(value, "base64"));
  },
};
