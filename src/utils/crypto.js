const CryptoJS = require("crypto-js");

// Encrypt
const encrypt = (message, secret) => {
  return CryptoJS.AES.encrypt(message, secret).toString();
};

// Decrypt
const decrypt = (ciphertext, secret) => {
  var bytes = CryptoJS.AES.decrypt(ciphertext, secret);
  return bytes.toString(CryptoJS.enc.Utf8);
};

exports.encrypt = encrypt;
exports.decrypt = decrypt;
