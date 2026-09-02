import Nat8 "mo:core/Nat8";
import Nat "mo:core/Nat";

/// GameKey alphabet, €→Doka suggestion, email/code checks, and unbiased
/// entropy-to-symbol conversion. Generation entropy is IC `raw_rand` in main.
module {

    /// 1000 Doka = 10 Euro.
    public let DOKA_PER_EURO : Nat = 100;
    public let CODE_LENGTH : Nat = 120;
    public let REQUEST_COOLDOWN_NS : Int = 60_000_000_000;
    public let MAX_EMAIL : Nat = 200;
    public let MAX_HINT_EURO_CENTS : Nat = 10_000_000;

    /// ASCII letters, digits, and symbols. Length is not a power of two;
    /// `appendFromEntropy` rejects bytes at/above `unbiasedLimit` so `n % size`
    /// is unbiased.
    public let ALPHABET : Text = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*_+-=";

    func alphabetChars() : [Char] {
        ALPHABET.toArray()
    };

    public func suggestedDokaFromEuroCents(euroCents : Nat) : Nat {
        // 100 cents/€ and 100 Doka/€ → Doka == euro-cents.
        euroCents
    };

    public func isAlphabetChar(c : Char) : Bool {
        ALPHABET.contains(#char c)
    };

    public func validateCodeFormat(code : Text) : ?Text {
        if (code.size() < CODE_LENGTH) {
            return ?"GameKey is too short";
        };
        if (code.size() > CODE_LENGTH) {
            return ?"GameKey is too long";
        };
        for (c in code.chars()) {
            if (not isAlphabetChar(c)) {
                return ?"GameKey contains invalid characters";
            };
        };
        null
    };

    /// Consume IC entropy bytes into ASCII symbols without modulo bias.
    public func appendFromEntropy(current : Text, bytes : [Nat8]) : Text {
        let chars = alphabetChars();
        let size = chars.size();
        if (size == 0) { return current };
        let limit = (256 / size) * size;
        var out = current;
        label consume for (b in bytes.values()) {
            if (out.size() >= CODE_LENGTH) { break consume };
            let n = b.toNat();
            if (n < limit) {
                out #= chars[n % size].toText();
            };
        };
        out
    };

    public func validateEmail(email : Text) : ?Text {
        let t = email.trim(#char ' ');
        if (t.size() < 6 or t.size() > MAX_EMAIL) {
            return ?"Email must be between 6 and 200 characters";
        };
        var atCount : Nat = 0;
        var atPos : Nat = 0;
        var i : Nat = 0;
        var lastDot : Nat = 0;
        for (c in t.chars()) {
            if (c == ' ' or c == '\n' or c == '\t' or c == '\r') {
                return ?"Email cannot contain whitespace";
            };
            // mailto: query separators. A raw client used to store
            // `a@b.com?subject=` so the admin mailto href injected extra headers.
            let code = c.toNat32();
            if (code == 0x3F or code == 0x26 or code == 0x23 or code == 0x3A
                or code == 0x2F or code == 0x5C or code == 0x3C or code == 0x3E
                or code == 0x22 or code == 0x27 or code == 0x2C or code == 0x3B
                or code == 0x25) {
                return ?"Email contains characters that cannot be used in mailto";
            };
            if (c == '@') {
                atCount += 1;
                atPos := i;
            };
            if (c == '.') { lastDot := i };
            i += 1;
        };
        if (atCount != 1) { return ?"Email must contain a single @" };
        if (atPos == 0) { return ?"Email is missing the local part" };
        if (lastDot <= atPos + 1) { return ?"Email domain is missing a dot" };
        if (lastDot + 1 >= t.size()) { return ?"Email domain is incomplete" };
        null
    };

    public func validateConsent(consent : Bool) : ?Text {
        if (not consent) {
            ?"Consent is required to use this email for the GameKey"
        } else {
            null
        }
    };

    public func validateHintEuroCents(cents : Nat) : ?Text {
        if (cents > MAX_HINT_EURO_CENTS) {
            ?"Intended amount exceeds the maximum hint"
        } else {
            null
        }
    };

    public func rejectOpenRequest(hasOpen : Bool) : ?Text {
        if (hasOpen) {
            ?"A GameKey purchase is already open"
        } else {
            null
        }
    };

    public func requestCooldownActive(lastSent : Int, now : Int) : Bool {
        now - lastSent < REQUEST_COOLDOWN_NS
    };

    /// Compare every character; do not return on the first mismatch.
    public func constantTimeEqual(a : Text, b : Text) : Bool {
        let aa = a.toArray();
        let bb = b.toArray();
        let n = Nat.max(aa.size(), bb.size());
        var acc : Nat32 = 0;
        var i = 0;
        while (i < n) {
            let ca : Nat32 = if (i < aa.size()) { aa[i].toNat32() } else { 0xFFFFFFFF };
            let cb : Nat32 = if (i < bb.size()) { bb[i].toNat32() } else { 0xFFFFFFFE };
            acc |= ca ^ cb;
            i += 1;
        };
        acc == 0 and aa.size() == bb.size()
    };

};
