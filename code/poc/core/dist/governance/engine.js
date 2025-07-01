"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceEngine = exports.StakingTier = exports.VoteType = exports.ProposalStatus = exports.ProposalType = void 0;
// ============================================================================
// CORE GOVERNANCE TYPES & INTERFACES
// ============================================================================
var ProposalType;
(function (ProposalType) {
    ProposalType["PARAMETER_CHANGE"] = "parameter_change";
    ProposalType["TREASURY_SPEND"] = "treasury_spend";
    ProposalType["PROTOCOL_UPGRADE"] = "protocol_upgrade";
    ProposalType["GOVERNANCE_CHANGE"] = "governance_change";
    ProposalType["EMERGENCY_ACTION"] = "emergency_action";
})(ProposalType || (exports.ProposalType = ProposalType = {}));
var ProposalStatus;
(function (ProposalStatus) {
    ProposalStatus["DRAFT"] = "draft";
    ProposalStatus["ACTIVE"] = "active";
    ProposalStatus["VOTING"] = "voting";
    ProposalStatus["PASSED"] = "passed";
    ProposalStatus["REJECTED"] = "rejected";
    ProposalStatus["EXECUTED"] = "executed";
    ProposalStatus["EXPIRED"] = "expired";
    ProposalStatus["VETOED"] = "vetoed";
})(ProposalStatus || (exports.ProposalStatus = ProposalStatus = {}));
var VoteType;
(function (VoteType) {
    VoteType["YES"] = "yes";
    VoteType["NO"] = "no";
    VoteType["ABSTAIN"] = "abstain";
})(VoteType || (exports.VoteType = VoteType = {}));
// ============================================================================
// ENHANCED GOVERNANCE FEATURES
// ============================================================================
var StakingTier;
(function (StakingTier) {
    StakingTier["EXPLORER"] = "explorer";
    StakingTier["CURATOR"] = "curator";
    StakingTier["PASSPORT"] = "passport";
    StakingTier["VALIDATOR_DELEGATE"] = "validator_delegate"; // 1000 TOK, 12 months
})(StakingTier || (exports.StakingTier = StakingTier = {}));
// ============================================================================
// MAIN GOVERNANCE ENGINE CLASS
// ============================================================================
class GovernanceEngine {
    constructor(chainAdapter, storageProvider, reputationEngine, // Remove 'any'
    tokenEngine // Remove 'any'
    ) {
        this.chainAdapter = chainAdapter;
        this.storageProvider = storageProvider;
        this.reputationEngine = reputationEngine;
        this.tokenEngine = tokenEngine;
        this.proposals = new Map();
        this.votes = new Map(); // proposalId -> votes
        this.stakes = new Map(); // userId -> stake
        this.milestones = [];
        // Governance parameters
        this.STAKING_TIERS = {
            [StakingTier.EXPLORER]: {
                minTokens: 25,
                minDuration: 30,
                trustScoreMinimum: 0.3,
                privileges: ['comment', 'vote_basic']
            },
            [StakingTier.CURATOR]: {
                minTokens: 100,
                minDuration: 90,
                trustScoreMinimum: 0.4,
                privileges: ['comment', 'vote_basic', 'propose_basic', 'list_royalties']
            },
            [StakingTier.PASSPORT]: {
                minTokens: 500,
                minDuration: 180,
                trustScoreMinimum: 0.5,
                privileges: ['comment', 'vote_basic', 'propose_basic', 'ai_discount']
            },
            [StakingTier.VALIDATOR_DELEGATE]: {
                minTokens: 1000,
                minDuration: 365,
                trustScoreMinimum: 0.6,
                privileges: ['comment', 'vote_enhanced', 'propose_advanced', 'run_indexer', 'multisig_candidate']
            }
        };
        this.initializeGovernanceMilestones();
    }
    // ============================================================================
    // INITIALIZATION & SETUP
    // ============================================================================
    initializeGovernanceMilestones() {
        this.milestones = [
            {
                name: 'Economic Stake',
                description: '10% of total supply staked and 5,000 distinct voters',
                requirements: {
                    totalStaked: 1000000000, // 10% of 10B tokens
                    uniqueVoters: 5000
                },
                unlocks: ['Full treasury spend authority'],
                achieved: false
            },
            {
                name: 'Network Scale',
                description: '100k daily active wallets and $10M exchange liquidity',
                requirements: {
                    dailyActiveUsers: 100000,
                    exchangeLiquidity: 10000000
                },
                unlocks: ['Fee parameters control', 'Burn split adjustment'],
                achieved: false
            },
            {
                name: 'Ecosystem Maturity',
                description: '5 independent dApps live and 2 external audits completed',
                requirements: {
                    independentDApps: 5,
                    securityAudits: 2
                },
                unlocks: ['Multisig signer management', 'Protocol parameter control'],
                achieved: false
            }
        ];
    }
    // ============================================================================
    // STAKING MANAGEMENT
    // ============================================================================
    async stakeForGovernance(userId, amount, lockDuration) {
        // Validate user has sufficient tokens
        const userBalance = await this.tokenEngine.getBalance(userId);
        if (userBalance < amount) {
            throw new Error('Insufficient token balance for staking');
        }
        // Validate user's trust score
        const trustScore = await this.reputationEngine.getTrustScore(userId);
        // Determine tier based on amount and duration
        const tier = this.determineTier(amount, lockDuration, trustScore);
        const tierRequirements = this.STAKING_TIERS[tier];
        if (trustScore < tierRequirements.trustScoreMinimum) {
            throw new Error(`Trust score ${trustScore} insufficient for ${tier} tier`);
        }
        // Create stake
        const stake = {
            userId,
            amount,
            tier,
            stakedAt: new Date(),
            lockDuration,
            isActive: true
        };
        // Lock tokens via token engine
        await this.tokenEngine.lockTokens(userId, amount, lockDuration);
        // Store stake
        this.stakes.set(userId, stake);
        // Record on-chain
        await this.chainAdapter.submitTransaction({
            type: 'governance_stake',
            data: stake
        });
        return stake;
    }
    determineTier(amount, duration, trustScore) {
        // Check in descending order of requirements
        for (const [tier, requirements] of Object.entries(this.STAKING_TIERS).reverse()) {
            if (amount >= requirements.minTokens &&
                duration >= requirements.minDuration &&
                trustScore >= requirements.trustScoreMinimum) {
                return tier;
            }
        }
        return StakingTier.EXPLORER;
    }
    async unstakeTokens(userId) {
        const stake = this.stakes.get(userId);
        if (!stake) {
            throw new Error('No active stake found');
        }
        const lockEndTime = new Date(stake.stakedAt.getTime() + stake.lockDuration * 24 * 60 * 60 * 1000);
        const now = new Date();
        if (now < lockEndTime) {
            // Early exit penalty (5% burn)
            const penalty = Math.floor(stake.amount * 0.05);
            await this.tokenEngine.burnTokens(penalty);
            await this.tokenEngine.unlockTokens(userId, stake.amount - penalty);
        }
        else {
            // Normal unlock
            await this.tokenEngine.unlockTokens(userId, stake.amount);
        }
        stake.isActive = false;
        await this.chainAdapter.submitTransaction({
            type: 'governance_unstake',
            data: { userId, amount: stake.amount }
        });
    }
    // ============================================================================
    // PROPOSAL MANAGEMENT
    // ============================================================================
    async createProposal(proposal) {
        // Validate proposer eligibility
        const stake = this.stakes.get(proposal.author);
        if (!stake || !stake.isActive) {
            throw new Error('Must have active stake to create proposals');
        }
        const trustScore = await this.reputationEngine.getTrustScore(proposal.author);
        if (trustScore < proposal.stakingRequirements.minTrustScore) {
            throw new Error('Insufficient trust score for proposal creation');
        }
        // Generate proposal ID
        const proposalId = this.generateProposalId();
        // Create full proposal
        const fullProposal = {
            ...proposal,
            id: proposalId,
            createdAt: new Date(),
            status: ProposalStatus.DRAFT,
            authorReputationAtCreation: trustScore
        };
        // Store proposal
        this.proposals.set(proposalId, fullProposal);
        this.votes.set(proposalId, []);
        // Store content in IPFS if large
        if (fullProposal.description.length > 1000) {
            const ipfsHash = await this.storageProvider.store({
                title: fullProposal.title,
                description: fullProposal.description,
                metadata: fullProposal
            });
            fullProposal.ipfsHash = ipfsHash;
        }
        // Record on-chain
        await this.chainAdapter.submitTransaction({
            type: 'governance_proposal',
            data: {
                id: proposalId,
                author: proposal.author,
                type: proposal.type,
                ipfsHash: fullProposal.ipfsHash
            }
        });
        return proposalId;
    }
    async activateProposal(proposalId) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error('Proposal not found');
        }
        if (proposal.status !== ProposalStatus.DRAFT) {
            throw new Error('Can only activate draft proposals');
        }
        // Set voting period
        proposal.votingStartTime = new Date();
        proposal.votingEndTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        proposal.status = ProposalStatus.ACTIVE;
        await this.chainAdapter.submitTransaction({
            type: 'governance_activate',
            data: { proposalId, votingStartTime: proposal.votingStartTime }
        });
    }
    // ============================================================================
    // ENHANCED VOTING SYSTEM
    // ============================================================================
    async voteOnProposal(proposalId, userId, voteType, reason) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error('Proposal not found');
        }
        if (proposal.status !== ProposalStatus.ACTIVE) {
            throw new Error('Proposal is not in voting phase');
        }
        // Check if user already voted
        const existingVotes = this.votes.get(proposalId) || [];
        if (existingVotes.some(v => v.voter === userId)) {
            throw new Error('User has already voted on this proposal');
        }
        // Calculate voting power
        const votingPower = await this.calculateVotingPower(userId);
        const stake = this.stakes.get(userId);
        const trustScore = await this.reputationEngine.getTrustScore(userId);
        const vote = {
            id: this.generateVoteId(),
            proposalId,
            voter: userId,
            voteType,
            votingPower,
            reputationAtVote: trustScore,
            stakeAmount: stake?.amount || 0,
            stakingTier: stake?.tier || StakingTier.EXPLORER,
            timestamp: new Date(),
            reason
        };
        // Store vote
        existingVotes.push(vote);
        this.votes.set(proposalId, existingVotes);
        // Record on-chain
        await this.chainAdapter.submitTransaction({
            type: 'governance_vote',
            data: {
                proposalId,
                voter: userId,
                voteType,
                votingPower
            }
        });
    }
    async calculateVotingPower(userId) {
        const stake = this.stakes.get(userId);
        if (!stake || !stake.isActive) {
            return 0;
        }
        const trustScore = await this.reputationEngine.getTrustScore(userId);
        // Geometric mean of staked tokens and reputation (prevents whale domination)
        const geometricMean = Math.sqrt(stake.amount * (trustScore * 1000));
        // Apply tier multiplier
        const tierMultipliers = {
            [StakingTier.EXPLORER]: 1.0,
            [StakingTier.CURATOR]: 1.2,
            [StakingTier.PASSPORT]: 1.5,
            [StakingTier.VALIDATOR_DELEGATE]: 1.5 // Same as passport, but other privileges
        };
        const tierMultiplier = tierMultipliers[stake.tier];
        // Cap at 3% of total voting power to prevent whale capture
        const maxVotingPower = this.getTotalPossibleVotingPower() * 0.03;
        return Math.min(geometricMean * tierMultiplier, maxVotingPower);
    }
    getTotalPossibleVotingPower() {
        // Calculate based on all active stakes
        let total = 0;
        for (const stake of this.stakes.values()) {
            if (stake.isActive) {
                total += stake.amount;
            }
        }
        return total;
    }
    // ============================================================================
    // PROPOSAL EXECUTION & RESULTS
    // ============================================================================
    async finalizeProposal(proposalId) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error('Proposal not found');
        }
        if (proposal.status !== ProposalStatus.ACTIVE) {
            throw new Error('Proposal is not in voting phase');
        }
        if (new Date() < proposal.votingEndTime) {
            throw new Error('Voting period has not ended');
        }
        const votes = this.votes.get(proposalId) || [];
        const result = this.calculateVotingResult(proposal, votes);
        // Update proposal status
        if (result.quorumReached && result.majorityAchieved) {
            proposal.status = ProposalStatus.PASSED;
            // Schedule execution with time-lock
            setTimeout(async () => {
                await this.executeProposal(proposalId);
            }, proposal.executionParameters.timelock * 24 * 60 * 60 * 1000);
        }
        else {
            proposal.status = ProposalStatus.REJECTED;
        }
        // Record results on-chain
        await this.chainAdapter.submitTransaction({
            type: 'governance_result',
            data: { proposalId, result, newStatus: proposal.status }
        });
        return result;
    }
    calculateVotingResult(proposal, votes) {
        let totalVotingPower = 0;
        let yesVotes = 0;
        let noVotes = 0;
        let abstainVotes = 0;
        const tierBreakdown = {
            [StakingTier.EXPLORER]: { count: 0, power: 0 },
            [StakingTier.CURATOR]: { count: 0, power: 0 },
            [StakingTier.PASSPORT]: { count: 0, power: 0 },
            [StakingTier.VALIDATOR_DELEGATE]: { count: 0, power: 0 }
        };
        const reputationBreakdown = { high: 0, medium: 0, low: 0 };
        for (const vote of votes) {
            totalVotingPower += vote.votingPower;
            // Count votes by type
            switch (vote.voteType) {
                case VoteType.YES:
                    yesVotes += vote.votingPower;
                    break;
                case VoteType.NO:
                    noVotes += vote.votingPower;
                    break;
                case VoteType.ABSTAIN:
                    abstainVotes += vote.votingPower;
                    break;
            }
            // Track by tier
            tierBreakdown[vote.stakingTier].count++;
            tierBreakdown[vote.stakingTier].power += vote.votingPower;
            // Track by reputation
            if (vote.reputationAtVote >= 0.7)
                reputationBreakdown.high++;
            else if (vote.reputationAtVote >= 0.4)
                reputationBreakdown.medium++;
            else
                reputationBreakdown.low++;
        }
        const totalPossiblePower = this.getTotalPossibleVotingPower();
        const participationRate = totalVotingPower / totalPossiblePower;
        const quorumReached = participationRate >= proposal.requiredQuorum;
        const majorityAchieved = yesVotes > (yesVotes + noVotes) * proposal.requiredMajority;
        return {
            proposalId: proposal.id,
            totalVotingPower,
            yesVotes,
            noVotes,
            abstainVotes,
            participationRate,
            quorumReached,
            majorityAchieved,
            passed: quorumReached && majorityAchieved,
            voterBreakdown: {
                byTier: tierBreakdown,
                byReputation: reputationBreakdown
            }
        };
    }
    async executeProposal(proposalId) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal || proposal.status !== ProposalStatus.PASSED) {
            throw new Error('Proposal cannot be executed');
        }
        // Check if still within veto window
        const vetoDeadline = new Date(proposal.votingEndTime.getTime() +
            proposal.executionParameters.vetoWindow * 24 * 60 * 60 * 1000);
        if (new Date() < vetoDeadline) {
            // Still in veto window - check for veto votes
            const vetoVotes = await this.checkForVetoVotes(proposalId);
            if (vetoVotes > 0.1 * this.getTotalPossibleVotingPower()) { // 10% can veto
                proposal.status = ProposalStatus.VETOED;
                return;
            }
        }
        // Execute based on proposal type
        try {
            await this.executeProposalByType(proposal);
            proposal.status = ProposalStatus.EXECUTED;
            await this.chainAdapter.submitTransaction({
                type: 'governance_executed',
                data: { proposalId, executedAt: new Date() }
            });
        }
        catch (error) {
            console.error(`Failed to execute proposal ${proposalId}:`, error);
            // Proposal remains in PASSED state for manual intervention
        }
    }
    async executeProposalByType(proposal) {
        switch (proposal.type) {
            case ProposalType.PARAMETER_CHANGE:
                await this.executeParameterChange(proposal);
                break;
            case ProposalType.TREASURY_SPEND:
                await this.executeTreasurySpend(proposal);
                break;
            case ProposalType.PROTOCOL_UPGRADE:
                await this.executeProtocolUpgrade(proposal);
                break;
            case ProposalType.GOVERNANCE_CHANGE:
                await this.executeGovernanceChange(proposal);
                break;
            case ProposalType.EMERGENCY_ACTION:
                await this.executeEmergencyAction(proposal);
                break;
            default:
                throw new Error(`Unknown proposal type: ${proposal.type}`);
        }
    }
    // ============================================================================
    // PROPOSAL TYPE EXECUTION HANDLERS
    // ============================================================================
    async executeParameterChange(proposal) {
        // Implementation would depend on specific parameter being changed
        console.log(`Executing parameter change: ${proposal.title}`);
        // This would integrate with the specific system being modified
    }
    async executeTreasurySpend(proposal) {
        // Implementation would transfer tokens from treasury
        console.log(`Executing treasury spend: ${proposal.title}`);
        // await this.tokenEngine.treasuryTransfer(recipient, amount);
    }
    async executeProtocolUpgrade(proposal) {
        // Implementation would handle protocol upgrades
        console.log(`Executing protocol upgrade: ${proposal.title}`);
        // This would require careful coordination with deployment systems
    }
    async executeGovernanceChange(proposal) {
        // Implementation would modify governance parameters
        console.log(`Executing governance change: ${proposal.title}`);
        // Could modify quorum requirements, voting periods, etc.
    }
    async executeEmergencyAction(proposal) {
        // Implementation would handle emergency actions
        console.log(`Executing emergency action: ${proposal.title}`);
        // High-priority actions that might bypass normal timelock
    }
    // ============================================================================
    // MILESTONE & DECENTRALIZATION TRACKING
    // ============================================================================
    async checkMilestones() {
        const updatedMilestones = [];
        for (const milestone of this.milestones) {
            if (!milestone.achieved) {
                const achieved = await this.evaluateMilestone(milestone);
                if (achieved) {
                    milestone.achieved = true;
                    milestone.achievedAt = new Date();
                    await this.chainAdapter.submitTransaction({
                        type: 'governance_milestone',
                        data: milestone
                    });
                }
            }
            updatedMilestones.push(milestone);
        }
        this.milestones = updatedMilestones;
        return updatedMilestones;
    }
    async evaluateMilestone(milestone) {
        const { requirements } = milestone;
        // Check total staked
        if (requirements.totalStaked) {
            const totalStaked = Array.from(this.stakes.values())
                .filter(s => s.isActive)
                .reduce((sum, s) => sum + s.amount, 0);
            if (totalStaked < requirements.totalStaked)
                return false;
        }
        // Check unique voters
        if (requirements.uniqueVoters) {
            const uniqueVoters = new Set();
            for (const votes of this.votes.values()) {
                votes.forEach(vote => uniqueVoters.add(vote.voter));
            }
            if (uniqueVoters.size < requirements.uniqueVoters)
                return false;
        }
        // Additional checks would be implemented for other requirements
        // (dailyActiveUsers, exchangeLiquidity, etc.)
        return true;
    }
    // ============================================================================
    // QUERY & UTILITY METHODS
    // ============================================================================
    async getProposal(proposalId) {
        return this.proposals.get(proposalId) || null;
    }
    async getProposalsByStatus(status) {
        return Array.from(this.proposals.values())
            .filter(p => p.status === status);
    }
    async getActiveProposals() {
        return this.getProposalsByStatus(ProposalStatus.ACTIVE);
    }
    async getUserStake(userId) {
        return this.stakes.get(userId) || null;
    }
    async getUserVotingPower(userId) {
        return this.calculateVotingPower(userId);
    }
    async getProposalVotes(proposalId) {
        return this.votes.get(proposalId) || [];
    }
    async getGovernanceStats() {
        const totalStaked = Array.from(this.stakes.values())
            .filter(s => s.isActive)
            .reduce((sum, s) => sum + s.amount, 0);
        const uniqueStakers = Array.from(this.stakes.values())
            .filter(s => s.isActive).length;
        const milestonesAchieved = this.milestones.filter(m => m.achieved).length;
        return {
            totalProposals: this.proposals.size,
            activeProposals: Array.from(this.proposals.values())
                .filter(p => p.status === ProposalStatus.ACTIVE).length,
            totalStaked,
            uniqueStakers,
            totalVotingPower: this.getTotalPossibleVotingPower(),
            milestonesAchieved
        };
    }
    // ============================================================================
    // PRIVATE UTILITY METHODS
    // ============================================================================
    generateProposalId() {
        return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateVoteId() {
        return `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async checkForVetoVotes(proposalId) {
        // Implementation would check for veto votes during execution window
        // This is a placeholder - real implementation would track veto votes separately
        return 0;
    }
}
exports.GovernanceEngine = GovernanceEngine;
//# sourceMappingURL=engine.js.map