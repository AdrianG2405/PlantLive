import { Capacitor, registerPlugin } from "@capacitor/core";

const PasswordManager = registerPlugin("PasswordManager");

export const hasNativePasswordManager = () => Capacitor.getPlatform() === "android";

export const savePassword = async (email, password) => {
  if (!hasNativePasswordManager()) return;
  await PasswordManager.save({ email, password });
};

export const getSavedPassword = async () => {
  if (!hasNativePasswordManager()) return null;
  return PasswordManager.get();
};
