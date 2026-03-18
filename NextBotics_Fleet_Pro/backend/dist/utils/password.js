"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateSecurePassword = generateSecurePassword;
exports.generateResetToken = generateResetToken;
exports.generateCompanySlug = generateCompanySlug;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const SALT_ROUNDS = 10;
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
function generateSecurePassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + special;
    // Ensure at least one of each type
    let password = '';
    password += uppercase[crypto_1.default.randomInt(uppercase.length)];
    password += lowercase[crypto_1.default.randomInt(lowercase.length)];
    password += numbers[crypto_1.default.randomInt(numbers.length)];
    password += special[crypto_1.default.randomInt(special.length)];
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
        password += allChars[crypto_1.default.randomInt(allChars.length)];
    }
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}
function generateResetToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
function generateCompanySlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
//# sourceMappingURL=password.js.map