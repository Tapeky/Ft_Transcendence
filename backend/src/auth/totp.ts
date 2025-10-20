import jsSHA from 'jssha'

export const TOTP_DIGITS = 6
export const TOTP_ONE_TIME_DURATION = 30

function getCounter() {
	const epoch = Math.floor(Date.now() / 1000)
	return (Math.floor(epoch / TOTP_ONE_TIME_DURATION))
}

function dec2hex(s: number) {
	return (s < 15.5 ? '0' : '') + Math.round(s).toString(16);
}

function hex2dec(s: string) {
	return parseInt(s, 16);
}

function leftPad(str: string, len: number, pad: string) {
	if (len + 1 >= str.length) {
		str = new Array(len + 1 - str.length).join(pad) + str;
	}
	return str;
}

const BASE32_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32ToHex(base32: string) {
	var bits = "";
	var hex = "";

	for (var i = 0; i < base32.length; i++) {
		var val = BASE32_ALPHA.indexOf(base32.charAt(i).toUpperCase());
		if (val == -1)
			throw "Invalid character: " + base32.charAt(i)
		bits += leftPad(val.toString(2), 5, '0');
	}

	for (i = 0; i + 4 <= bits.length; i += 4) {
		var chunk = bits.substring(i, i + 4);
		hex += parseInt(chunk, 2).toString(16);
	}
	return hex;
}

export function getOTP(secret: string) {
	const shaObj = new jsSHA("SHA-1", "HEX", {
		hmacKey: {format: "HEX", value: base32ToHex(secret)}
	})
	shaObj.update(leftPad(dec2hex(getCounter()), 16, '0'))

	const hmac = shaObj.getHMAC("HEX")
	const offset = hex2dec(hmac.charAt(hmac.length - 1)) * 2;
	const otp = (hex2dec(hmac.substring(offset, offset + 8)) & 0x7fffffff).toString();
	return otp.substring(otp.length - TOTP_DIGITS);
}

export function generateOTPSecret() {
	var otp = ''
	for (var i = 0; i < 32; i++) {
		const rand = Math.floor(Math.random() * 32)
		otp += BASE32_ALPHA[rand]
	}
	return otp
}

// https://github.com/google/google-authenticator/wiki/Key-Uri-Format
export function formatOTPUri(issuer: string, email: string, secret: string) {
	return `\
otpauth://totp/${issuer}:\
${email}?secret=${secret}&\
issuer=${issuer}&\
algorithm=SHA1&\
digits=${TOTP_DIGITS}&\
period=${TOTP_ONE_TIME_DURATION}`
}
