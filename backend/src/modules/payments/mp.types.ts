// Shared Mercado Pago payment type enum and helpers

export enum MpPaymentType {
  AccountMoney = 'account_money',
  Ticket = 'ticket',
  BankTransfer = 'bank_transfer',
  Atm = 'atm',
  CreditCard = 'credit_card',
  DebitCard = 'debit_card',
  PrepaidCard = 'prepaid_card',
  DigitalCurrency = 'digital_currency',
  VoucherCard = 'voucher_card',
  CryptoTransfer = 'crypto_transfer',
}

export const MP_ALL_PAYMENT_TYPES: readonly MpPaymentType[] = [
  MpPaymentType.AccountMoney,
  MpPaymentType.Ticket,
  MpPaymentType.BankTransfer,
  MpPaymentType.Atm,
  MpPaymentType.CreditCard,
  MpPaymentType.DebitCard,
  MpPaymentType.PrepaidCard,
  MpPaymentType.DigitalCurrency,
  MpPaymentType.VoucherCard,
  MpPaymentType.CryptoTransfer,
] as const;

// Default allowed per business rules
export const MP_DEFAULT_ALLOWED_TYPES: readonly MpPaymentType[] = [
  MpPaymentType.AccountMoney,
  MpPaymentType.CreditCard,
  MpPaymentType.DebitCard,
  MpPaymentType.PrepaidCard,
] as const;

// Types that are toggleable in staff UI (account money is always enabled)
export const MP_TOGGLEABLE_ALLOWED_TYPES: readonly MpPaymentType[] = [
  MpPaymentType.CreditCard,
  MpPaymentType.DebitCard,
  MpPaymentType.PrepaidCard,
] as const;

export function isMpPaymentType(v: unknown): v is MpPaymentType {
  return typeof v === 'string' && (MP_ALL_PAYMENT_TYPES as readonly string[]).includes(v);
}
