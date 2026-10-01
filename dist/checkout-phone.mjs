// Shared browser/server format validation. This does not verify phone ownership.
export function normalizeCheckoutPhone(input) {
  const error = 'Enter a valid phone number, such as 0412 345 678 or +61 412 345 678. Use + and the country code for an overseas number.';
  if (typeof input !== 'string' || input.length > 40 || !/^\+?[0-9\s().-]+$/.test(input.trim()))
    throw new Error(error);
  let phone = input.trim().replace(/[\s().-]/g, '');
  if (phone.startsWith('00')) phone = '+' + phone.slice(2);
  if (/^0[23478]\d{8}$/.test(phone)) phone = '+61' + phone.slice(1);
  else if (/^61[23478]\d{8}$/.test(phone)) phone = '+' + phone;
  phone = phone.replace(/^\+610/, '+61');
  if (!/^\+[1-9]\d{7,14}$/.test(phone) ||
      (phone.startsWith('+61') && !/^\+61[23478]\d{8}$/.test(phone)) ||
      /^(\d)\1+$/.test(phone.slice(1)))
    throw new Error(error);
  return phone;
}
