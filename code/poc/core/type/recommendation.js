/**
 * Recommendation Data Structure
 *
 * Represents a recommendation in the OmeoneChain system
 * Based on Technical Specifications A.2.1
 */
/**
 * Types of actions that can be performed on a recommendation
 */
export var RecommendationActionType;
(function (RecommendationActionType) {
    RecommendationActionType["CREATE"] = "create";
    RecommendationActionType["UPDATE"] = "update";
    RecommendationActionType["UPVOTE"] = "upvote";
    RecommendationActionType["DOWNVOTE"] = "downvote";
    RecommendationActionType["DELETE"] = "delete";
})(RecommendationActionType || (RecommendationActionType = {}));
