/**
 * User Reputation Model
 *
 * Represents a user's reputation and contribution metrics in the OmeoneChain system
 * Based on Technical Specifications A.2.2
 */
export var VerificationLevel;
(function (VerificationLevel) {
    VerificationLevel["BASIC"] = "basic";
    VerificationLevel["VERIFIED"] = "verified";
    VerificationLevel["EXPERT"] = "expert";
})(VerificationLevel || (VerificationLevel = {}));
