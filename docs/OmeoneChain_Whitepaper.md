# White Paper

# OmeoneChain: The Personal Recommendations Network. Powered by a Decentralized DAG

## Executive Summary

OmeoneChain is a social network for personal recommendations, not another review site. Built on a high‑throughput DAG ledger, it turns every recommendation from a friend, or a friend-of-a-friend, into a verifiable on-chain event. A Trust Score replaces the blunt five-star average, while a token-reward loop pays contributors in proportion to the real impact their advice has along the social graph.

Traditional recommendation platforms suffer from fundamentally flawed incentive structures where businesses must pay for visibility and prominence, creating an inherently biased system. These "pay-to-play" models prioritize revenue over recommendation quality, often placing sponsored listings above genuinely superior options. And while users create all the valuable content that powers these platforms, they receive little to no compensation for their contributions. This artificial manipulation, combined with opaque algorithms, creates a system in which users increasingly do not feel that they can truly trust what they see, a feeling that has only been exacerbated by the increase in artificial intelligence-generated content, which has lowered the cost to provide generic, undifferentiated reviews (often referred to as "AI-slop"). OmeoneChain counters with an immutable provenance layer: each recommendation is hashed, time-stamped and tied to a reputational identity, giving AI modules clean, spam-free data to power truly personalized discovery.

A fixed 10 billion-token supply, halving schedule and social-weighted reward formula sustain long-term incentives without inflation. Vendors engage through NFT-based experiences rather than ads, and a hybrid governance model lets the community steer policy while a core team safeguards security.

OmeoneChain is more than a recommendation site: It is a comprehensive ecosystem that re-imagines how people share word-of-mouth online. By aligning incentives across all participants, the network aims to set a new standard for personal recommendations, creating authentic connections and unlocking a future where trust, transparency, and true value reign supreme.

## 1. Introduction

Popular review platforms such as Google Reviews, Yelp, Tripadvisor, and others, often provide a service that is good enough to motivate repeat use among those interested in finding new restaurants, bars, hotels, and other services. And yet, users still often navigate away from their experiences with these platforms with the sense that they could have been better, given the technology and resources available to them. Indeed, some of the existing platforms are multi-billion-dollar businesses, with annual expenditures that range in the US$ hundreds of millions and even include substantial budgets for product development. And yet, for most people, real discovery continues to happen elsewhere: in family chats, group-text threads, podcasts, traditional media, and social feeds where trusted voices share personal recommendations. OmeoneChain's goal is to capture that off-platform word-of-mouth, anchor it on an open ledger, and give users an interface that not only makes those tips instantly searchable but also automatically organizes them into lists, filters, and personal feeds in a manner much more intuitive than group chats and scrolling timelines allow for.

Given that there is market competition among these popular faceless review platforms, and that many of the key players in the market are well-resourced, the ultimate problem underlying the platforms is likely one of incentives. In other words, the business models under which the existing platforms operate may not be consistent with producing outcomes that promote credibility, transparency, or relevance for the different actors in the ecosystem. Some of the underlying incentive challenges faced by these platforms reflect the well-chronicled[^1] shortfalls inherent in their structure as corporate networks, as they shift from an initial growth phase, focused on attracting users, to a monetization phase, where sponsored content and paid visibility take precedence over organic recommendations. In the case of these platforms, the extractive phase limits the credibility and usefulness of their review systems, undermining trust and the efficient aggregation of valuable insights.

This project will seek to redefine how personal recommendations are shared and curated by linking them to a social graph using blockchain technology. Through the establishment of transparent and immutable commitments, OmeoneChain will ensure credible, tamper-proof content, while introducing tokenized incentives that empower content creators, curators, and opinion leaders. The system will also provide structured commercial opportunities for businesses and service providers while eliminating ad-driven ranking manipulation.

Beyond enhancing trust and transparency, the network will introduce search and personalization features that give users greater control over recommendation algorithms, addressing the long-standing aggregation problem that limits discovery on traditional platforms. While blockchain alone cannot solve every challenge, its decentralized structure—combined with incentive-driven dApps—will reshape the user experience, fostering more authentic interactions and rewarding contributions equitably.

Through this new model, the network aligns incentives among users, contributors, and businesses, creating a credible, community-driven alternative to existing recommendation networks. By structuring the ecosystem around transparency, fairness, and user-first principles, it aims to deliver a superior discovery experience—one where users leave feeling informed and satisfied, rather than manipulated or uncertain.

## 2. Problem Statement

Despite the widespread use of online review platforms such as Google Reviews, Yelp, and Tripadvisor, significant issues persist that undermine their credibility, transparency, and utility. Trust in faceless reviews seems to be eroding rapidly, while consumers are placing more value on advice from people they know or admire. According to the *2025 Local Consumer Review* by BrightLocal, only 42% of consumers now place as much trust in online reviews as personal recommendations, down significantly from its level of 79% of consumers in 2020[^2]. This collapse in trust is why OmeoneChain focuses on personal recommendations tied to a verifiable social graph. Fake online reviews are already estimated at US$152 billion per year, with 4% of all online reviews suspected of being fake[^3]. And yet, that figure of 4% may also be significantly underestimating the size of the problem, since it is based on industry self-reporting, represents a proportion much lower than the 14% found in more in-depth estimates in specific service sector reviews (Home Service, Legal, and Medical)[^4], and since these estimates may not be taking into account fake reviews generated by artificial intelligence, which have conceivably begun to proliferate throughout the review platform ecosystem since 2023. In response to the latter problem, such review platforms are already applying artificial intelligence tools to try to detect fake AI-generated reviews, but it is still unclear which side will win this arms race and what the impact of generative AI will be on the overall ecosystem of review platforms (with the obvious risk being that they may be overwhelmed by AI-generated slop that further weakens the signal provided by authentic and earnest reviews).

### 2.1. Lack of Transparency

One of the most significant concerns with existing platforms is the lack of transparency regarding how reviews are curated and displayed. Review platforms collect vast amounts of user data without making it clear how this data is being used, often monetizing user behavior without offering direct benefits to the contributors of valuable content. Furthermore, algorithmic ranking systems operate as black boxes, leaving users in the dark about why certain recommendations are prioritized. This opacity raises concerns that ranking mechanisms may be influenced by undisclosed pay-to-play schemes rather than objective quality metrics.

Additionally, the integration of advertisements and paid promotions into recommendation results further compromises transparency. Users often see sponsored listings appearing above highly rated services, with little indication that these placements were purchased rather than earned through authentic positive reviews. This blending of paid content and organic recommendations distorts the trustworthiness of the platform. Furthermore, businesses and service providers frequently lack an official presence on these platforms unless they pay for advertising or sponsored features, leaving them with limited opportunities to engage meaningfully with their audience.

### 2.2. Lack of Credibility

In addition to transparency issues, the credibility of review platforms is frequently undermined by the prevalence of fake reviews, biased feedback, and unverified sources. Many businesses and institutions attempt to manipulate their standing by generating positive reviews about themselves or posting negative feedback about competitors. This practice skews recommendation systems, making it difficult for users to trust the legitimacy of ratings. Additionally, spam and outdated reviews clutter many platforms, making it challenging for users to navigate and find relevant, high-quality insights.

Another key credibility issue stems from the anonymity and lack of verifiable reputation for reviewers. Users often have little information about who is providing a review and whether that individual's preferences align with their own. Without a system to establish trust in reviewers, recommendations become generalized and unreliable. Furthermore, review platforms fail to incentivize ongoing participation, meaning that even well-intentioned users may not continue contributing over time, leading to stagnant or outdated content.

### 2.3. Aggregation Challenges

Even when transparency and credibility concerns are addressed, the way that existing platforms aggregate recommendations presents additional limitations. Many review systems rely on broad numerical ratings, averaging out diverse opinions into a single score that may not reflect the specific preferences of individual users. This approach limits the potential for personalized discovery, trapping users in predictable feedback loops where they are only exposed to mainstream recommendations rather than niche or emerging options.

Sorting mechanisms further exacerbate this problem. Default sorting methods, such as "Most Relevant" or "Top Reviews," often fail to account for the nuances of individual preferences. The logic behind these ranking systems is unclear, and they may prioritize widely popular options over those that would be more suitable for a particular user's needs. Moreover, existing recommendation platforms struggle to accommodate different use cases. A user seeking a restaurant for a family dinner may receive the same recommendations as someone searching for a romantic evening out, despite vastly different criteria influencing their decision.

Additionally, aggregation methods fail to account for the dynamic nature of user preferences. People's tastes evolve over time, yet recommendation algorithms rarely adapt to reflect these changing interests. Similarly, aggregated ratings do not differentiate between different experiences within a business—such as the difference between ordering a steak versus a vegetarian dish at a restaurant—failing to provide users with the granularity needed to make informed choices.

### 2.4. Bridging the Gaps with Decentralized Innovation

The shortcomings of existing recommendation platforms highlight the need for a fundamentally different approach—one that prioritizes transparency, credibility, and personalization while aligning incentives more equitably among users, content creators, and service providers. Current systems rely on opaque ranking mechanisms, suffer from artificial review inflation, and struggle to adapt to diverse user needs. Addressing these issues requires more than minor improvements; it demands a reimagining of how trust, engagement, and discovery function in the digital age.

By leveraging decentralized technology, a new model can emerge that ensures all recommendations are transparent and verifiable while enabling more meaningful interactions between users and service providers. Token-based incentives can reward valuable contributions, encouraging sustained participation and high-quality content. Decentralized governance can replace opaque decision-making processes, allowing users to have a direct stake in how the network evolves. Most importantly, a system designed around user-controlled data, open algorithms, and trust-based reputation metrics can break free from the limitations of existing corporate networks, paving the way for a new era of authentic, unbiased recommendations.

## 3. Solution Overview

OmeoneChain transforms everyday word‑of‑mouth into a verifiable, searchable stream of personal recommendations. Discovery begins inside each user's social circle, travels across a transparent ledger that time‑stamps every action and is amplified by token rewards that scale with the real impact a tip has along that graph. The result feels like browsing the best ideas from a trusted group chat, yet it is provably resistant to pay‑for‑placement manipulation.

To address transparency and credibility challenges, blockchain technology will help to ensure that an immutable public record of recommendations is available to all users that would like to better understand it. As a result, users will be able to better trace the origin of recommendations, upvotes and downvotes accrued, and the underlying content that influences curation decisions. This same traceability will also allow users to better understand ranking criteria and any algorithms that they would like to employ to simplify the user experience, rather than having such algorithms remain a black box, which may or may not be influenced by marketing spend and "pay-to-play" schemes. Since the network will encourage open development through decentralized applications, it will allow third parties to build on top of the ecosystem, to help to further enhance innovation, customization, engagement, and the overall experience of users of the network.

### 3.1 Social Graph and Personal Recommendation Engine

OmeoneChain replaces the faceless star‑rating model with a verifiable social graph that lets users decide whose advice matters. In practice it feels like scrolling your friends' group‑chat tips—but with provenance and reputation scored on‑chain. A wallet owner may choose to link a pseudonym, ENS handle or real name, signing that link on‑chain, then follow friends, curators or niche experts whose advice they value. Those follow edges are recorded as hashed references, so reputations cannot be forged while personal data remains private.

When a user opens the app, recommendations are ranked in three clearly explained tiers. First come posts endorsed by people the user follows; next appear items that statistical matching shows to fit the user's existing tastes; finally, an exploration factor introduces fresh suggestions from high‑reputation contributors, so discovery never stalls. Every entry carries a small label that breaks down how much of its score derives from social trust, quality marks and freshness, and the entire ranking algorithm can be swapped out for any open‑source alternative that plugs into the same graph.

Each save, up‑vote and skip creates a private taste vector that corresponds to the unique user's wallet. Third‑party dApps can access this vector (never the raw browsing history) through an open API to run collaborative‑filtering or large‑language‑model recommenders. Because every interaction is a verifiable revealed preference, OmeoneChain's social graph performs the data‑cleaning step that legacy platforms outsource, giving AI modules a pristine, self‑curating training set. As a result, spam and AI-slop are less likely to persist, since fake reviews will less likely earn endorsements from users with reputation, and their trust weights will stay near 0. Also, taste profiles will self-calibrate, as the embedding will become richer the more a user interacts with the network. And, finally, models will continuously improve as AI dApps can retrain on chain‑filtered data streams and publish their weights or evaluation metrics back on‑chain, keeping the whole process auditable.

### 3.2. Infrastructure: DAG Ledger for Speed and Transparency

In the case of this network, the blockchain solution will not be that of a traditional blockchain data structure such as those applied by Bitcoin or Ethereum; rather, the solution will be based on a Directed Acyclic Graphs (DAG) data structure. Unlike traditional blockchains that organize transactions into sequential blocks, a Directed Acyclic Graph (DAG) structures transactions as a web of interlinked actions, allowing multiple transactions to be processed in parallel. This enables faster, more scalable, and low-cost interactions without the need for energy-intensive mining. In a DAG, each new action simply references two earlier ones, allowing thousands of micro‑interactions—up‑votes, list edits, trust annotations—to confirm in parallel and at negligible cost. Every recommendation is represented on‑chain by a hash, while heavier assets such as images or long‑form text sit in decentralized off‑chain storage. The architecture offers real‑time user experience, low fees that make social gestures economically viable, and throughput that grows as the community grows.

### 3.3. Token-Reinforced Trust Loop

Tokens convert social influence into tangible value. Posting a new tip mints a small base reward. During the following thirty days, that reward multiplies whenever the tip persuades someone in the author's social graph to save, book or up‑vote it. An endorsement from a direct follower carries a Trust‑Weight of 0.75; an interaction that arrives via a follower‑of‑a‑follower counts for 0.25; beyond two hops it no longer adds weight. Curators who assemble themed lists earn a share of the multipliers generated by the items they showcase, reinforcing thoughtful curation over volume. Conversely, accounts that submit spam or plagiarized content forfeit their pending rewards, which are redirected—in part—to the users who flagged the abuse.

Because the graph structure, ranking weights and reward formulas are openly published, developers can layer their own taste‑matching models, multilingual feeds or advanced analytics on top without needing permission. For end‑users, the feed feels personal and trustworthy; for builders, the platform is an open, incentive‑aligned foundation.

### 3.4 UI and User Experience -- From Stars to Trust Scores

OmeoneChain abandons the global five‑star average in favor of a *Trust Score* that is calculated only from endorsements inside a user's social perimeter. When a venue card appears in the feed, the first visual cue is a badge such as "Trust 8.3 / 10 (±1 hop)". The figure reflects weighted signals from friends, and friends‑of‑friends, plus each endorser's on‑chain reputation; spam accounts and distant strangers contribute nothing. Hovering or tapping the badge reveals a concise provenance breakdown: "23 saves/ 11 direct friends/ 12 friends‑of‑friends", allowing users to audit why a tip surfaced. Below the badge, familiar social markers reinforce the human context: follower avatars, curator list tags, and the line "*New in three of your playlists*".

For newcomers who still want a crowd metric, a *Global Score* will be available behind an optional toggle. It appears in muted grey and carries a tooltip that warns, "*Includes unverified public ratings; may contain noise*". This subtle UI hierarchy steers attention to personalized trust while preserving a bridge to legacy habits. As a result, discovery feels intuitive, with a quick number to glance at, but the number now embodies word‑of‑mouth provenance rather than raw volume, keeping the interface welcoming, yet uniquely resistant to rating inflation, bots, and AI‑generated review‑slop.

## 4. Network Architecture

OmeoneChain leverages a Directed Acyclic Graph (DAG) to support its decentralized, user-first recommendation system. Each user action, whether it be adding a recommendation, upvoting content, or curating a list, is recorded as a node in the DAG. The DAG structure ensures scalability, transparency, and energy efficiency by allowing parallel processing of actions and using previous nodes for validation instead of resource-intensive mining.

Recommendations are added by users through a streamlined submission process, with metadata (e.g., categories, tags, and timestamps) stored in the DAG. To maintain quality, recommendations are verified through a combination of reputation-based systems, algorithmic filters, and structured community input mechanisms rather than arbitrary moderation. Users can access content through intuitive search and filtering tools, while personalized recommendations are enabled by analyzing patterns in the DAGs structure.

By combining the transparency of decentralized technology with the scalability of a DAGs structure, the network seeks to ensure a seamless and user-friendly experience, setting the stage for a thriving, trustworthy recommendation ecosystem.

### 4.1. Technical Design

To achieve these benefits, the network will leverage IOTA's Rebased, a next generation, object-based DAG that succeeds the original Tangle. Rebased keeps the parallel‑processing and energy‑efficient design of its predecessor while adding Move‑VM smart contracts and a micro‑fee, burn‑and‑reward model that secures the ledger without introducing prohibitive costs. The baseline fee is expected to remain far below one US cent, and a built‑in "sponsor wallet" mechanism will allow the project to absorb fees on behalf of users where friction‑less UX is essential. Because consensus is still leader‑less and highly scalable, throughput scales with network activity, keeping recommendation latency low even at high volume. To stay future‑proof, the architecture exposes a chain‑adapter layer. Should breakthroughs in parallelized DAGs (e.g., Constellation HGTP) or other high‑throughput ledgers emerge, the core logic can be ported with minimal change, ensuring long‑term adaptability.

### 4.2. Tokenomics

OmeoneChain's token economy rewards verifiable impact along the social graph, not raw posting volume. No tokens are minted when a user first submits a tip; a payout is unlocked only after that tip proves useful, as measured by a Trust Score ≥ 0.25. Each save, up-vote or list inclusion by a follower multiplies the payout by a transparent Trust-Weight (0 -- 3 ×) derived from on-chain reputation and social distance (1 hop = 0.75, 2 hops = 0.25, beyond 2 hops = 0). A fixed 10 billion-token rewards pool is released according to a halving schedule that cuts issuance by 50 % at pre-set milestones, preserving long-term scarcity while still motivating early participation. Together, impact-first rewards and predictable supply create a sustainable ecosystem that aligns users, curators, and businesses.

#### 4.2.1. Token Distribution: Faucets

Tokens are distributed to users through a variety of incentivized actions, ensuring active participation and content creation. These distribution mechanisms include:

- **On-boarding Starter Pack:** New users earn a one-time bonus of up to 5 TOK for (a) following ≥ 3 trusted accounts, (b) posting five original recommendations that each reach Trust 0.20 within 14 days, and (c) interacting with 10 distinct tips.

- **Creating Recommendations:** When a recommendation reaches Trust 0.25 its author receives 1 TOK × Σ Trust-weights (capped at 3 ×).

- **Trusted Upvotes:** Authors earn 1 TOK per 10 up-votes from wallets with Trust ≥ 0.5, capped at 5 TOK per post.

- **Curating Lists:** Curators receive 1 TOK once their list gains ≥ 3 trusted saves, plus 25 % of downstream impact rewards generated by list items.

- **Referral Program:** Up to 2 TOK are rewarded to users for referring new participants who actively engage with the network. 1 TOK when the referred user completes the Starter Pack and another 1 TOK when their first tip reaches Trust 0.25.

- **Leaderboard Pool (50 TOK / week):** A rolling 7-day Impact Score ranks contributors; the top 10 % enter a verifiable random draw that awards 10 weekly prizes (20 , 12 , 8 , 4 , 1 × 6 TOK). Scores reset every week to keep competition open.

- **Reporting Spam / Abuse:** Reporters receive 1 TOK per confirmed flag plus 10 % of any slashed rewards.

All other actions, such as giving up-votes, build a user's Reputation / Trust Score but do not mint tokens directly.

#### 4.2.2. Token Consumption: Sinks and Their Utility

To ensure a sustainable token economy, the network incorporates multiple token sinks—mechanisms through which tokens are spent or consumed. Every paid action on OmeoneChain is a token sink: Part of the fee is routed to operations and grants, while the rest is sent to a burn address, permanently lowering supply. Unless otherwise voted by governance, the default split is 75 % burn / 25 % treasury. This design ties network success directly to token scarcity without compromising the impartial Trust-Score ranking.

- **Service-Provider Commission (10%).** Curated dining events, tasting tours, and other vendor transactions pay a 10 % protocol fee; 75 % of that fee is burned, 25 % funds audits, infra, and ecosystem grants.

- **Expert Content Paywall (10-15%).** Critics and influencers can charge for deep-dive lists; the protocol's cut follows the 75 / 25 burn-treasury rule.

- **NFT Tickets and Loyalty Passes (3-5%).** Each mint or secondary sale triggers a fee—again, three-quarters burned.

- **Taste-Passport / AI Concierge (1 TOK per plan).** Users buying AI-generated itineraries burn 0.8 TOK; 0.2 TOK pays the model-provider DAO.

- **Taste-Twin Bundles (2-5 TOK - negotiated)** -- 80% flows to the remote curator after escrow unlock; the remaining 0.4-1.0 TOK is burned.

- **Developer SDK & Oracle Fees.** Monthly license paid in TOK; 75 % burned, 25 % to Ecosystem Fund.

- **Micro-transaction Subsidy.** Peer-to-peer tips remain feeless to users; Sponsor-Wallet fees are reimbursed out of treasury, not the Rewards Pool.

- **Governance Participation and Staking:** Tokens locked for proposals and votes are not spent but temporarily removed from circulation, providing a non-inflationary sink.

By integrating multiple token sinks into OmeoneChain's economy, tokens are not merely distributed but actively utilized in a way that reinforces their real-world value. These sinks create a flywheel: more economic activity → more tokens burned → greater scarcity → stronger incentive to contribute quality content, which drives yet more activity. Governance can adjust burn ratios or add new sinks, but no sink may alter the Trust-Score algorithm or default ranking—preserving the network's transparency and quality focus as monetization scales.

#### 4.2.3. Halving Mechanism and Distribution Milestones

At launch, token rewards will be set at their highest issuance rate, incentivizing early contributors. After 10% of tokens have been distributed, a halving event is triggered, reducing the reward rate by 50% for subsequent distributions. This process continues through ten halving cycles until the total token supply has been fully allocated.

By design, this halving schedule is immutable and cannot be altered by governance decisions. This ensures predictability, economic stability, and credibility, preventing inflationary or arbitrary token supply adjustments. While governance mechanisms may oversee general token policy and reward structures, they will not have the authority to modify the fixed halving schedule.

This structured distribution model safeguards the long-term value of the token by controlling supply scarcity while ensuring sustained incentives for participation. As rewards gradually decrease, the network's broader ecosystem—driven by user engagement, real-world transactions, and service-based commerce—will ensure continued token demand and utility beyond the initial distribution phase. This balance between controlled issuance and increasing network adoption reinforces both the token's longevity and the economic sustainability of the network.

#### 4.2.4. Staking Mechanisms

Staking in OmeoneChain is a signal of commitment, not a lever to distort rankings. Locked tokens do three things:

- **Raise your Trust-Score Ceiling:** A staked wallet can confer larger Trust bonuses (capped at 3 ×) on posts it saves or up-votes.

- **Open Governance Rights:** Proposal submission and weighted voting require a minimum stake.

- **Unlock Premium Features:** Optional Taste Passport discount and curator royalty boosts activate only while the stake is held.

Tokens are escrowed in a smart-contract for a user-chosen period (1--12 months); early exit incurs a 5 % burn penalty, discouraging mercenary staking. Because staking never alters default sort order and pays no automatic yield, it supports network health without inviting "pay-to-rank" critique.

| **Stake tier** | **Minimum lock** | **Added utility** |
|----------------|------------------|-------------------|
| **Explorer** | 25 TOK, 1 month | Submit governance comments; Trust-Score cap +0.1 |
| **Curator** | 100 TOK, 3 months | Eligible for 25 % list-royalty share; Trust cap +0.3 |
| **Passport** | 50 TOK, 6 months | 50 % discount on AI itineraries & Twin Bundles |
| **Validator delegate** *(future)* | 1,000 TOK, 12 months | Can run light-indexer node; vote weight ×1.5 |

*Governance may adjust tiers, but staking will never override the Trust-Score algorithm or hide unpaid content.*

#### 4.2.5. Governance

The network embraces a streamlined, community-driven governance model, ensuring efficiency while incorporating user input into key decisions. Rather than a fully decentralized voting system, governance follows a hybrid approach, balancing core development oversight with community-driven influence. Governance mechanisms include:

- **Community Input & Proposal System:** Users with established reputation scores or a minimum number of staked tokens can submit proposals for community feedback. These proposals may cover network improvements, reward adjustments, or new feature introductions.

- **Reputation-Based Influence:** Rather than relying solely on token-based voting, governance incorporates user reputation and engagement metrics to ensure that contributions come from active, trusted participants, mitigating risks of manipulation by large token holders.

- **Core Development Oversight:** A core team or foundation will handle technical upgrades, security maintenance, and protocol development, ensuring that governance remains efficient and agile while considering community perspectives.

- **Transparency & Accountability:** All governance decisions, voting records, and proposal discussions are publicly recorded on the DAG ledger, maintaining a fully auditable governance history.

This hybrid governance model ensures that OmeoneChain remains community-driven without excessive bureaucracy, fostering a collaborative and sustainable decision-making process while keeping core functionality and security under expert oversight.

#### 4.2.6. Token Utilities

The network's tokens serve as more than just a reward mechanism—they are a versatile tool that enhances the overall user experience. Key utilities include:

- **Tipping:** Users can send tokens directly to other users to show appreciation for valuable recommendations or curated lists.

- **Graph-weighted tipping:** When you tip a recommender, a micro‑bonus flows to anyone upstream in your social graph who originally surfaced that tip—a visible 'thank‑you chain' that reinforces discovery.

- **Marketplace Transactions:** Tokens can be used for peer-to-peer transactions, such as paying for custom recommendations or premium services.

- **Incentivizing Quality Content:** Tokens serve as a direct incentive for users to create and maintain high-quality recommendations and lists.

- **NFT Integration:** Users can spend tokens to create and trade NFTs that represent exclusive content, achievements, or digital collectibles related to the network.

The proposed tokenomics model balances fairness, utility, and sustainability by integrating faucets, sinks, staking, and governance. By aligning incentives for users and contributors, the network creates a dynamic ecosystem where tokens are both earned and spent in meaningful ways. Combined with the halving mechanism, this structure ensures the token economy remains robust, scalable, and aligned with the network's long-term goals.

### 4.3. Data Handling and Security

OmeoneChain is designed with robust mechanisms to ensure the privacy, security, and integrity of user-generated content. Privacy is a core principle, with users able to interact anonymously and without the need to share personally identifiable information (PII). User IDs are pseudonymized, and only essential metadata—such as timestamps, tags, and anonymized identifiers—is stored in the Directed Acyclic Graph (DAG). By minimizing data collection and prioritizing user control, the network aligns with modern data protection regulations such as GDPR and LGPD.

All data interactions are encrypted using advanced cryptographic techniques. Data at rest is secured with AES-256 encryption, while data in transit is protected with TLS protocols. For private interactions, such as direct transactions between users, end-to-end encryption ensures that only intended recipients can access the content. Key management is handled securely, leveraging decentralized mechanisms wherever feasible.

To prevent data loss, a distributed storage backup system is implemented, ensuring that recommendation data remains available even if some nodes go offline. IPFS pinning mechanisms keep content accessible across multiple storage nodes, while DAG-based transaction validation mechanisms help prevent fraudulent activity or manipulation of recommendations. These layers of security and redundancy ensure that the network remains resilient, decentralized, and highly secure, even as the user base and transaction volume grow.

#### 4.3.1. Privacy-Preserving Encryption and Data Handling

The network employs privacy-preserving encryption to secure recommendations, content integrity, and user interactions without compromising decentralization. While user-generated recommendations are stored transparently within the DAG structure, sensitive metadata (such as cryptographic signatures, content hashes, and off-chain references) are encrypted to prevent unauthorized tampering.

Importantly, no personally identifiable information (PII) is collected or stored by the network. Off-chain storage solutions are fully decentralized where possible, leveraging IPFS or other distributed networks to prevent centralized control over user data. Encryption is applied only to protect content authenticity and integrity, ensuring that the network remains resilient, private, and censorship-resistant without introducing risks of centralized data collection.

This approach ensures that the network maintains full transparency and decentralization while respecting user privacy and security.

#### 4.3.2. Data Access Control and Decentralized Storage

Access control policies ensure that sensitive data is protected while maintaining transparency. Public actions, such as recommendations and upvotes, are visible to all users, while private data, such as token transactions, is accessible only to relevant parties. Role-based permissions and community-governed policies further safeguard the network's integrity.

Recommendations will be stored securely using a hybrid approach. Metadata will be stored directly in the DAG, benefiting from its decentralized and immutable structure. Full recommendation content will be stored in distributed off-chain solutions, such as IPFS, with the DAG maintaining secure pointers to the data. This approach is necessary because while DAG technology efficiently records metadata, timestamps, and validation hashes, it is not optimized for storing large amounts of text, images, or multimedia content. Storing full recommendations directly on-chain would lead to high storage costs, slower performance, and unnecessary data bloat. Instead, the network records a cryptographic hash of each recommendation on the DAG for verification, while the full content is stored securely off-chain using distributed storage solutions. This ensures that recommendations remain immutable, easily retrievable, and scalable without compromising performance or decentralization. When users retrieve a recommendation, they can verify its authenticity by comparing the on-chain hash with the corresponding off-chain data. This mechanism ensures that content remains tamper-resistant and verifiable. Furthermore, a redundancy system ensures that recommendations remain accessible even in cases where the primary IPFS node is unavailable, providing users with uninterrupted access to content. This approach combines transparency, scalability, and redundancy, ensuring that user-generated content remains secure and accessible without compromising privacy.

By implementing these measures, the network ensures that user data is handled with the highest standards of security and trust, fostering confidence and long-term engagement.

## 5. Token Economy

The network's token economy is designed to drive sustainable engagement, reward valuable contributions, and support long-term ecosystem growth. With a fixed supply of 10 billion tokens, the network ensures scarcity while incentivizing meaningful participation.

### 5.1. Token Allocation

The overall token supply is fixed at 10 billion, with no additional minting after launch. Token distribution is structured as follows:

- **5.2 billion tokens (52%) -- Rewards Pool:** Dedicated to rewarding users for providing high-quality recommendations, curation, and engagement.

- **2.0 billion tokens (20%) -- Development Reserves:** Allocated for network maintenance, upgrades, security audits, and developer incentives.

- **1.6 billion tokens (16%) -- Liquidity & Ecosystem:** Used for partnerships, liquidity provisioning, and strategic ecosystem initiatives.

- **1.2 billion tokens (12%) -- Founders & Team:** Reserved to ensure long-term alignment between the core development team and the network's success.

This allocation structure ensures that OmeoneChain remains user-first, developer-friendly, and financially sustainable, prioritizing both community-driven content creation and long-term infrastructure investment.

### 5.2. Token Use

The network's token economy is designed to facilitate seamless transactions, incentivize high-quality content, and support a dynamic ecosystem of services and applications. Users have full control over their tokens, allowing them to exchange value freely within the network. One of the core use cases for the token is peer-to-peer transactions, where users can tip content creators, pay for curated lists, or compensate others for personalized recommendations and services. This feature enhances engagement by enabling users to reward meaningful contributions directly.

Beyond user-to-user transactions, tokens serve as a medium of exchange for NFT-based experiences. Businesses and creators can issue network-integrated NFTs that provide access to exclusive reservations, premium events, and digital memberships. This tokenized commerce allows vendors to create unique experiences that users can access seamlessly using tokens. Additionally, governance participation forms an essential aspect of the token economy, as users can stake tokens to vote on key network decisions, ensuring that the ecosystem evolves in a decentralized and community-driven manner.

Developers and businesses can also leverage tokens for dApp access and premium services. Third-party developers building on the network may introduce advanced curation tools, AI-driven recommendation engines, or personalized discovery features, some of which may require token payments for premium access. Similarly, businesses offering in-person or virtual experiences can accept tokens as payment, creating a commercial layer where service providers engage directly with network users. A portion of these service transactions contributes to the service provider revenue share model, which helps sustain the network's ecosystem while ensuring fair value distribution.

By integrating these multiple use cases, OmeoneChain ensures that tokens remain actively circulated rather than held purely for speculation. Whether used for tipping, accessing premium content, participating in governance, transacting with businesses, or engaging with dApps, the network's token economy is designed to be functional, dynamic, and driven by real-world value.

### 5.3. Token Sustainability

OmeoneChain will employ a halving mechanism to ensure the long-term sustainability of its token economy while maintaining an equitable distribution model. At launch, the total token supply is capped at 10 billion, with no additional tokens minted after launch. Instead of relying on token burning, the network gradually reduces the rate of new token issuance through predefined halving events, which occur when a specific number of tokens have been distributed.

This gradual reduction in rewards creates natural scarcity, ensuring that token emissions last for decades while maintaining incentives for user participation. The halving mechanism rewards early adopters while ensuring that future contributors continue to receive meaningful incentives. As token rewards decrease over time, the network's broader token economy—powered by real-world transactions, dApp interactions, service provider payments, and governance participation—ensures ongoing token demand beyond the initial reward phase.

To maintain long-term viability, OmeoneChain integrates multiple token sinks, such as NFT-based commerce, governance staking, dApp premium services, and revenue-sharing mechanisms for service providers. To ensure seamless token circulation from the outset, the network will integrate with third-party exchanges as early as possible, allowing users to buy, sell, and transact within the ecosystem. While token rewards will initially drive distribution, exchange-based liquidity will play an increasingly vital role as the halving mechanism gradually reduces new token emissions. The network will actively explore exchange listings and liquidity provisioning strategies to ensure accessibility for new participants and commercial use cases. While market demand will drive trading activity, structured liquidity partnerships may be considered to enhance token stability and usability as adoption scales.

Unlike models that rely on inflation or token burning to manage supply, this approach mirrors Bitcoin's proven halving strategy, offering users a predictable and transparent token economy. The combination of gradual supply reduction, multi-faceted token utility, and real-world adoption ensures that the network remains sustainable, resilient, and valuable as it grows.

IOTA Rebased attaches a nominal base fee—about 0.05 µMIOTA (≈ $0.00002)—to every on-chain action. To keep the user experience feeless, OmeoneChain will route those fees through a Sponsor-Wallet that fronts the cost and is reimbursed from the Rewards Pool in weekly batches. Appendix II shows the fee outflow is tiny (under 0.2 % of Year-1 emissions in every scenario); even under the updated Aggressive growth curve the 5.2 B-token pool funds roughly nine years before scheduled halvings become the dominant brake on supply, and more than six years in a hyper-growth case.

### 5.4. Monetization Strategy

As the network evolves, monetization strategies will be continually refined to ensure alignment with the core values of user empowerment, transparency, and impartiality. The network will remain unbiased by advertising or paid visibility boosting, ensuring that all recommendations and rankings are driven purely by quality and community engagement rather than external financial influence. OmeoneChain will seek to earn revenue without ever selling visibility. All income will flow from utility-based transactions, such as NFT tickets, premium AI services, vendor tools, and developer licenses, while the default Trust-Score ranking remains immutable. Governance holds the keys to adjust rates, publish treasury reports, and trigger buy-back-and-burn once core costs are covered. Monetization methods will be introduced in phases, aligning with user adoption and network growth:

*Phase 1: Launch and Early Growth*

Revenue is used first for exchange liquidity, infrastructure, audits, and community grants.

- **NFT & Tokenized Experiences** -- Businesses and creators can offer exclusive experiences, reservations, or perks through network-minted NFTs, with a small transaction fee (3-5%) collected by the network. This ensures seamless access to premium experiences while supporting the ecosystem.

- **Service-Provider Commission** -- Vendors and service providers who use the network to facilitate commercial transactions (e.g., selling curated experiences, organizing events, or providing specialized services) will contribute a 10% commission-based fee, ensuring fair value exchange while generating sustainable revenue.

- **Microtransaction Fees on Token Transfers** -- Peer-to-peer tips remain feeless; the Sponsor-Wallet pays the base fee and is reimbursed weekly from treasury.

- **Twin-Bundle Concierge** -- Travelers purchase a taste-twin bundle (2 TOK; first bundle per year free). 80 % to the curator (escrowed until Trust 0.20), 20 % to treasury.

- **Leaderboard Lottery** -- (50 TOK/week) and Starter-Pack costs are budgeted from the Rewards Pool, not operating revenue.

*Phase 2: User Expansion and dApp Ecosystem*

As OmeoneChain gains traction and stabilizes its liquidity, revenue will be strategically reinvested into token circulation, grants, and advanced services.

- **Taste Passport / AI Concierge** -- Users pay 1 TOK per itinerary (discounted with 50 TOK stake), 80% to model-provider DAO, 20% to protocol.

- **Premium Vendor Analytics** -- Vendors can buy subscription access to aggregated, anonymized dashboards to enhance their services, maintaining trust while offering value.

- **Developer SDK and Oracle Fees** -- High-volume API, trust-graph embeddings, and real-time oracle feeds licence at flat monthly token rates.

- **Hackathon and Grant Fund** -- Up to 25% of Phase-2 revenue earmarked for third-party dApps that hit usage milestones.

*Phase 3: Maturity and Optimization*

Once OmeoneChain reaches full-scale adoption, revenue will be redirected toward strengthening tokenomics and sustaining long-term growth:

- **Enterprise Insight Suite** -- City heat maps, cuisine trend indices, and sentiment scores offered to chains and tourism boards under SaaS contracts.

- **Buy-Back-and-Burn / Rewards Top-Up** -- When treasury exceeds 24 months of runway, DAO may vote to allocate up to 75 % of net income to buy TOK on the open market, either burning them or re-seeding the Rewards Pool.

- **Fee and Split Adjustments** -- Governance can fine-tune commission rates or SDK prices (super-majority + time-lock) to balance ecosystem health with token scarcity.

*Safeguards*

- **Ranking Firewall** -- No revenue stream can influence Trust-Score weighting or default sort order; any change requires a protocol upgrade and two-tier vote (core dev + community super-majority).

- **Transparent Treasury** -- All inflows/outflows published quarterly; multisig signers rotated annually.

- **Sybil-Proof Premiums** -- Paid features require wallet Trust ≥ 0.5, preventing farm abuse.

By coupling commerce-driven revenue with a hard firewall around content quality, OmeoneChain monetizes growth while preserving the transparency, integrity, and user-first ethos that differentiate it from legacy review platforms.

## 6. Incentive Structure

In general terms, users and contributors will be rewarded for adding value to the network. More specifically, they will be rewarded for activities that promote the creation and curation of quality content on the network, whether it be by creating that content themselves, upvoting, downvoting, or re-mixing other users' content in a valuable way, bringing new contributors to the network, or taking efforts to eliminate spam or abuse on the network. This structure ensures that users who actively participate and add value are rewarded proportionately, promoting fairness and encouraging sustained involvement. The table below details the Token Rewards distribution for the network:

**Table 1. Token Reward Distribution Table**

| **Action** | **Proposed Tokens** | **Conditions/Notes** |
|------------|---------------------|----------------------|
| **On-boarding Starter Pack** | Up to 5 tokens | • 0.5 TOK for following ≥ 3 trusted accounts.<br>• 0.5 TOK × 5 for submitting five original tips that each reach Trust ≥ 0.20 within 14 days.<br>• 2 TOK for up-voting or saving 10 distinct tips from ≥ 3 authors. |
| **Creating a Recommendation** | Trust bonus only (0 -- 3 x multiplier) | Tokens mint only after the tip's Trust Score reaches 0.25. Formula: *Reward = 1 TOK × Σ Trust-weights (cap 3 ×).* |
| **Trusted Up-Votes (author earns)** | 1 token per 10 upvotes | Up-votes count only from wallets with Trust ≥ 0.5. Capped at 5 TOK per post to avoid runaway gaps. |
| **Curating a List** | 1 TOK per 10 trusted up-votes | List must have ≥ 3 items and receive ≥ 3 trusted saves. Impact share is computed monthly. |
| **Leaderboard Pool** | 50 TOK / week | Distributed by weighted lottery to the **top decile** of Impact Scores (Σ base + trust bonuses). |
| **Up-voting Quality Content** | N/A (Reputation-only) | Builds the voter's Reputation / Trust Score; no direct tokens. |
| **Reporting Spam / Abuse** | 1 TOK per confirmed report + 10 % of slashed rewards | Report must be upheld by community moderators; claw-back taken from offender. |
| **Referral Program** | 2 TOK per referred user | Rewards distributed in tiers based on new user engagement (e.g., sign-up, first recommendation). |
| **Up-voting Quality Content** | (Reputation only) | Builds voter's Trust Score; no direct tokens. |

Tokens flow predominantly to actions that strengthen the social-trust graph—posting helpful tips, curating high-signal lists, and flagging abuse. Diminishing-return caps and trust gating keep emissions aligned with genuine value, while the fixed halving schedule protects long-term scarcity. This approach to token distribution ensures that the network remains rewarding, equitable, and resilient, aligning with the project's long-term vision of fostering a thriving, user-first ecosystem[^5].

Beyond monetary rewards, every interaction refines a user's private taste vector. The more someone contributes, the sharper the recommendations they receive, completing a virtuous loop of "participate, get paid, discover better." This dual incentive—tokens plus ever-improving personalization—creates a potentially powerful flywheel: helpful contributions earn rewards, rewards attract more contributors, and richer data sharpens recommendations, which in turn draws in even more users.

## 7. Governance Model

OmeoneChain relies on a two-tier hybrid. A three-of-five core-developer multisig can hot-patch critical bugs and sign the final transaction after any vote, while a community DAO, powered by staked tokens and on-chain reputation, decides everything else. This keeps the protocol agile when security is at stake, yet fully accountable for economic and policy choices.

### 7.1. Decision Scope

Routine grants, minor fee tweaks, and non-critical upgrades pass with a simple DAO majority and a seven-day time-lock. By contrast, any change that could warp the recommendation engine, such as burn ratio, micro-fee level, or the Trust-Score formula, needs a super-majority of DAO votes plus multisig approval, followed by a ninety-day delay that gives the community a final veto window. The token-supply schedule and halving events remain immutable and will not be influenced by the DAO.

### 7.2. Proposal and Voting Mechanics

A wallet qualifies to submit proposals once it stakes 100 TOK for at least three months and reaches a Trust Score of 0.4; lighter "Explorer" stakes (25 TOK, Trust 0.3) may still comment. Voting weight is the geometric mean of staked tokens and reputation but is capped at three percent of the total to prevent whale capture, and a motion becomes valid only if it attracts either twenty percent of all staked supply or one-thousand unique voters. The stake tiers will be the following:

- **Explorer:** 25 TOK staked, Trust 0.3 --- may comment

- **Curator:** 100 TOK staked, Trust 0.4 --- may propose

- **Validator Delegate:** 1 000 TOK staked, Trust 0.6 --- 1.5 × vote weight

### 7.3. Transparency and Safeguards

Every quarter the treasury will publish an on-chain ledger of revenue, the exact amount burned (default 75%), operational outlay, and remaining runway. Emergency patches executed by the multisig must be explained in a post-mortem within fourteen days. Any wallet flagged for abuse is muted from governance for thirty days and forfeits five per-cent of its stake, deterring Sybil attacks on voting.

### 7.4. Road-map to Full Decentralization

Governance powers migrate from core team to DAO as milestones are met:

- **Economic stake** -- 10% of total supply staked and 5 000 distinct voters → DAO gains full treasury-spend authority.

- **Network scale** -- 100 k daily active wallets and $10 M exchange liquidity → DAO may set fee parameters and adjust burn split.

- **Ecosystem maturity** -- Five independent dApps live and two external audits completed → DAO can add or remove multisig signers.

Transitions are phased and audited, ensuring the protocol never relinquishes security or transparency in a single leap.

## 8. Use Cases and Scenarios

OmeoneChain turns social trust into actionable discovery. The stories below—drawn from the restaurant domain that will launch first—show how personal recommendations flow through the graph, earn token rewards, and sometimes blossom into real‑world opportunities. The same mechanics will later extend to travel, wellness, entertainment, and other emergent areas on the network.

### 8.1. Use Case #1: Weekend Instant Trust

Meghan is a new mom and is suddenly less interested in the trendy dinner spots that she knows in New York City and more interested in finding kid-friendly brunch spots. She opens OmeoneChain and switches to the "Friends ± 1" filter and sees Brasserie du Soleil rise to the top with a Trust Score of 0.87—0.60 coming from her colleague Denise and 0.27 from Denise's barista friend Laura, whom Meghan has never met. Confident in the social provenance, Meghan books. After brunch she up‑votes the café; that single click multiplies Laura's original reward by 0.27 and grants Denise a 0.60 share for surfacing the tip. Meghan feels she is rewarding real people—not a faceless five‑star crowd.

### 8.2. Use Case #2: Travel with a Trusted Graph

Sophia, an avid traveler, is planning her first trip to Buenos Aires. She wants to find trendy, new restaurants and hidden gems that locals enjoy, rather than algorithmic "Top Tens". While browsing the network, she comes across a curated list titled "Authentic Spots in Buenos Aires" a list created by another user, Maria, who her travel-buddy Ana follows. Sophia saves three venues; Maria instantly earns impact bonuses and Ana receives a smaller referral reward. After dining, Sophia posts photo reviews, tipping Maria in tokens. A quick in‑app chat turns into coffee together when they discover overlapping itineraries, illustrating how OmeoneChain converts digital trust into offline connection.

### 8.3. Use Case #3: Earn as You Share

Paul has always consumed reviews passively. Tempted by token rewards, he uploads two favorite ramen joints. The moment he contributes, his Personalized Feed unlocks, blending nearby spots with tips popular among users who share his palate. Up‑votes on Paul's posts start to trickle in; when one of his lists—"Late‑night noodles, Northern Virginia"—is remixed by another curator, Paul's reputation climbs and so does his token balance. The loop is clear: the more authentic guidance he gives, the sharper (and more lucrative) his own discovery experience becomes.

### 8.4. Use Case #4: Builder Launches a Niche dApp

Kevin, a blockchain developer and coffee aficionado, uses OmeoneChain's open APIs to publish *BeanTrail*, a mini‑app that maps third‑wave cafés and issues on‑chain stamps for verified visits. *BeanTrail* reads the trust graph to weight ratings, lets cafés drop NFT loyalty passes, and shares a slice of transaction fees with the core protocol. Kevin monetizes premium filters (altitude‑grown beans, AeroPress specials), proving that third‑party creators can innovate without begging a central gatekeeper for API keys.

### 8.5. Use Case #5: Vendor and NFT Experiences

Wine‑curator Antonio spots an appetite for intimate Douro‑Valley tastings. Using an event‑management dApp built on OmeoneChain, he issues NFT tickets (payable in tokens, fiat, or other crypto) and promotes the gathering exclusively to followers with matching taste profiles. Meanwhile, restaurateur Roberta taps the same tooling to sell "kitchen‑counter" experiences at her family‑run trattoria, confident that visibility comes from customer trust, not ad spend. Guests who attend and post reviews generate token rewards that ripple back through the graph, while Antonio and Roberta enjoy a direct, ad‑free revenue stream.

### 8.6. Take-away

These scenarios highlight a few possible examples of how the network's unique features can foster authentic interactions, high-quality recommendations, and decentralized innovation. From weekend brunches to international pop‑ups and developer spin‑offs, OmeoneChain shows how verifiable word‑of‑mouth scales without sacrificing authenticity. Tokens reward impact, the ledger guarantees provenance, and the social graph keeps discovery human—demonstrating a clear, community‑driven alternative to sponsored review sites.

## 9. Security and Privacy

Security and privacy are fundamental to the network's design, ensuring that user data, recommendations, and token transactions remain protected from unauthorized access, exploitation, or misuse. As a decentralized recommendation system, the network prioritizes data security, encryption, and regulatory compliance while maintaining the transparency and openness inherent to a blockchain-based ecosystem. By implementing robust security protocols, the network safeguards both on-chain and off-chain data, ensuring that users retain control over their recommendations, engagement history, and token holdings.

### 9.1. Encryption for Recommendations and Data Protection

OmeoneChain will employ encryption mechanisms to protect user-generated recommendations. While recommendation metadata is stored on-chain to ensure transparency, the full content of recommendations remains off-chain, safeguarded by end-to-end encryption. This ensures that only the author and intended viewers can access the content, preventing unauthorized tampering or data exploitation. Additionally, cryptographic hashing is used to verify data integrity, ensuring that recommendations remain immutable and free from external manipulation. In the future, advanced privacy techniques such as Zero-Knowledge Proofs (ZKPs) may be explored to enhance data protection while maintaining transparency.

### 9.2. Secure Key Management for Token Transactions

To secure token transactions and user wallets, the network integrates non-custodial wallet support, allowing users to maintain full control over their private keys. Multi-signature authentication provides an added layer of protection for high-value transactions, ensuring that multiple approvals are required before execution. Furthermore, the network's smart contracts will undergo regular security audits to identify and mitigate vulnerabilities such as re-entrancy attacks, governance manipulation, or potential exploits. Security mechanisms, including rate-limiting and anomaly detection, will be implemented to monitor and prevent suspicious activity, enhancing the overall safety of the token economy.

## 9.3. Compliance with Privacy Regulations

Privacy compliance is a key consideration, as the network operates across multiple jurisdictions. The system is designed to align with major data protection regulations, including the General Data Protection Regulation (GDPR) in the European Union, the California Consumer Privacy Act (CCPA) in the United States, and Brazil's Lei Geral de Proteção de Dados (LGPD). These frameworks ensure that users retain control over their personal data, with the ability to delete or modify recommendations stored off-chain. Additionally, the network upholds transparency principles by enabling users to access and manage their data while maintaining blockchain immutability.

## 9.4. Protection against AI Scraping and Unauthorized Use

As a decentralized and open-access network, the system prioritizes accessibility while recognizing the need to mitigate large-scale AI scraping and unauthorized data mining. While strict anti-scraping measures will not be implemented at the outset to preserve openness, future mechanisms such as hashed content verification or watermarking may be introduced to prevent exploitation without restricting public access. Community-driven moderation and reputation-based verification will further contribute to the prevention of spam or AI-generated content, ensuring that the ecosystem remains both inclusive and secure.

Security and privacy remain central to the network's development, ensuring that users can interact with recommendations and tokenized incentives in a secure environment. By combining encryption, secure key management, and regulatory compliance, the network delivers a safe and transparent user experience. As the ecosystem evolves, security protocols will be continuously assessed and refined to adapt to emerging threats while upholding the network's decentralized principles.

## 10. Risks and Mitigation

As with any decentralized network, this project faces regulatory, market, and technical risks that must be carefully managed to ensure long-term sustainability. This section outlines potential challenges and the strategies in place to mitigate them.

### 10.1. Regulatory Risks and Compliance Measures

**Challenge: Adapting to Changing KYC/AML Compliance Regulations.** The evolving regulatory landscape surrounding cryptocurrency, decentralized finance (DeFi), and tokenized ecosystems introduces uncertainty, particularly regarding Know Your Customer (KYC) and Anti-Money Laundering (AML) compliance. Varying jurisdictional requirements could impact the network's ability to operate as a decentralized recommendation network while maintaining compliance.

**Mitigation Strategies:**

To navigate this challenge, the network will adopt a flexible regulatory strategy that includes:

- **Jurisdictional Flexibility & Legal Advisory Partnerships:** The network will monitor regulatory developments across multiple jurisdictions and consult legal experts specializing in blockchain compliance. This ensures the ability to adjust governance structures or operational models in response to evolving regulations.

- **Compliance-Ready Infrastructure:** As the network does not operate as a financial intermediary, third-party KYC/AML providers (e.g., exchanges) will handle token-to-fiat conversions where necessary, reducing compliance risks without directly collecting user data.

- **Proactive Engagement with Regulators:** The network will maintain open communication with relevant authorities, ensuring transparency and early adaptation to policy changes without compromising decentralization.

- **Privacy-Preserving Architecture:** By ensuring that only pseudonymized user data is stored, the network can maintain compliance with GDPR, CCPA, and other privacy regulations while upholding the principle of user anonymity.

### 10.2. Market Risks and Token Adoption

**Challenge: Ensuring Long-Term Token Demand and Utility.** A common risk in tokenized networks is the potential for low token demand, where users and businesses do not perceive enough value in the native token. Without sustained adoption, token circulation and network engagement could decline, limiting long-term viability. Ensuring that the token remains actively used rather than primarily held for speculation is crucial to the network's success.

**Mitigation Strategies:**

The network is designed to drive organic token demand through multiple interconnected strategies:

- **Multi-Faceted Token Utility:** The network's token sinks—including governance participation, NFT-based services, microtransactions, service provider revenue share, and premium dApp access—create continuous demand by tying the token's utility directly to real-world value.

- **Service Provider Revenue Share:** Businesses leveraging the network to facilitate exclusive events, curated experiences, and commercial transactions will contribute a percentage of revenue (~10%) back into the ecosystem. This further reinforces token usage within real-world commerce while ensuring sustainable network revenue.

- **Continued Token Circulation & Exchange Liquidity:** Even after reward distributions slow down due to the halving mechanism, tokens will still circulate through commercial transactions, governance participation, and peer-to-peer payments. Users will also be able to buy, sell, and trade tokens on third-party exchanges, ensuring long-term liquidity. While exchange listings depend on market conditions and third-party policies, the network will actively explore strategic exchange partnerships and liquidity solutions to maintain seamless token accessibility.

  - **Decentralized Exchange (DEX) Integration:** The network will initially launch on major decentralized exchanges (DEXs) to enable permissionless, trustless trading for early adopters and DeFi users. The liquidity strategy will be deployed in phases, starting with a smaller initial allocation (e.g., 1% of total supply) and scaling up as needed. To promote price stability and trading depth, liquidity will be primarily provided in token pairs, with USDC pools introduced later as the ecosystem grows.

  - **Centralized Exchange (CEX) Listings:** As adoption scales, the network will pursue targeted CEX partnerships to expand token reach and improve fiat on/off-ramp options. Listings on reputable CEXs will enhance liquidity depth and mainstream accessibility.

  - **Liquidity Pools & Trading Incentives:** While the network will initially provide controlled liquidity, governance may later introduce liquidity incentives (LP rewards) if additional depth is needed. These incentives would encourage long-term liquidity provision while ensuring a stable trading environment. The timing and structure of liquidity incentives will be assessed based on ecosystem growth, trading depth, and community governance proposals, with potential rewards subject to governance approval.

- **Gradual Token Supply Management:** The halving mechanism prevents rapid inflation, ensuring that token scarcity increases over time. This rewards long-term users and early adopters, helping to balance distribution while incentivizing consistent participation.

- **Enterprise Integrations & Partnerships:** Businesses and developers can integrate the network's recommendation engine into their own services via an API revenue model, increasing real-world demand for the token beyond individual user interactions.

- **Sustainable Growth Strategy:** Rather than relying solely on token speculation, the network prioritizes user-first adoption models, ensuring that participation remains high regardless of short-term market conditions. Incentive structures—such as early adopter benefits, engagement-based token rewards, and premium content monetization—foster a self-sustaining economy where tokens remain central to user engagement.

By aligning token demand with real-world value and ensuring exchange liquidity, the ecosystem remains resilient against market fluctuations. The network's tokenomics model ensures that tokens are continuously in circulation, tied to meaningful network activity, and structured for long-term sustainability.

### 10.3. Technical Risks: Base-Layer and Scalability

#### 10.3.1. Base-Layer Dependency

**Challenge: Timely Launch and Stable Operation of IOTA Rebased.** The project depends on the timely launch and stable operation of IOTA Rebased, scheduled for 5 May 2025[^1]. Potential hazards include (i) upgrade slippage, (ii) last‑minute fee‑policy changes, or (iii) critical consensus bugs in the early validator set. Any of these could delay main‑net cut‑over or degrade the "near‑zero‑fee" user experience that underpins OmeoneChain's micro‑transaction model.

**Mitigation Strategies.** Core logic interacts with the ledger through a chain‑adapter layer. Two adapters are maintained from day one:

- **RebasedAdapter:** Move‑VM objects on IOTA Rebased (primary).

- **EVMAdapter:** Solidity contracts on an EVM L2 with sub‑penny gas (Fantom Sonic or Arbitrum). A one‑click migrator exports user balances, reputation scores, and content‑hashes as JSON, redeploys contracts on the fallback chain, and re‑anchors historical Merkle roots. Weekly state snapshots ensure migration RPO < 7 days. This dual‑track strategy lets the application ship on Rebased while preserving an auditable escape hatch should base‑layer assumptions fail.

#### 10.3.2. DAG Scalability and Congestion

**Challenge: Managing DAG Scalability and Preventing Congestion.** As the network scales, network congestion or inefficiencies in the DAG architecture could impact transaction throughput and recommendation processing speeds. Ensuring data integrity and decentralized redundancy is critical to long-term performance.

**Mitigation Strategies:**

To address these concerns, the network employs a multi-layered approach to scalability and data integrity:

- **Leveraging Proven DAG Frameworks:** Leveraging Proven DAG Frameworks: Rather than building a bespoke ledger, the project builds on IOTA Rebased, whose object‑DAG and Mysticeti consensus deliver high throughput with micro‑fees that are both predictable and easily subsidized. If fee dynamics or throughput targets were to shift unfavorably, the chain‑adapter layer allows a controlled migration to alternate DAG networks—such as Constellation or a low‑cost EVM roll‑up—without rewriting business logic.

- **Hybrid Storage Model for Efficient Data Handling:** The network will employ a hybrid storage model, combining on-chain data recorded in the DAG with off-chain storage for larger content. This approach is necessary because while DAG technology efficiently records metadata, timestamps, and validation hashes, it is not optimized for storing large amounts of text, images, or multimedia content. Storing full recommendations directly on-chain would lead to high storage costs, slower performance, and unnecessary data bloat. Instead, the network records a cryptographic hash of each recommendation on the DAG for verification, while the full content is stored securely off-chain using distributed storage solutions. This ensures that recommendations remain immutable, easily retrievable, and scalable without compromising performance or decentralization. To optimize costs, metadata will be stored on-chain, while full recommendations and media files will be stored off-chain using distributed storage solutions (e.g., IPFS, Filecoin). This minimizes on-chain storage constraints and enhances retrieval speed.

- **Network Optimization and Redundancy Measures:** Continuous performance stress-testing will be conducted to refine DAG consensus algorithms and ensure stable throughput. Content redundancy mechanisms across multiple storage nodes will ensure that recommendation data remains accessible even if certain nodes fail.

By ensuring efficient scaling, hybrid storage solutions, and optimized transaction validation, the network minimizes risks associated with large-scale user adoption.

### 10.4. Governance and Decentralization Risks

**Challenge: Preventing Governance Manipulation and Network Abuse.** Decentralized governance presents risks such as large token holders exerting disproportionate influence or Sybil attacks, where multiple accounts are created to manipulate votes or exploit reward mechanisms.

**Mitigation Strategies:**

To mitigate these risks, the governance framework incorporates safeguards to maintain fairness and transparency:

- **Reputation-Based Governance Model:** Instead of relying purely on token-weighted voting, governance integrates reputation scores based on a user's contributions and engagement.

- **Stake-Based Safeguards:** Governance participation requires staking tokens with a vesting period, preventing users from acquiring tokens in bulk simply to manipulate decisions.

- **Gradual Transition to Decentralization:** While governance is initially guided by the core development team, increasing decentralization will be phased in as the community grows and stabilizes.

### 10.5. Monetization and Sustainability Risks

**Challenge: Ensuring Long-Term Financial Viability Without Ads.** Since the network avoids advertising-based monetization, it must establish sustainable revenue streams to cover infrastructure, storage, and developer compensation costs while maintaining a user-centric and transparent ecosystem.

**Mitigation Strategies:**

The network employs a diverse, non-intrusive monetization model that aligns with user-first principles, ensuring revenue generation without compromising the integrity of recommendations or user experience. Monetization strategies will be prioritized and scaled over time based on user adoption and ecosystem maturity:

*Phase I: Core Revenue Streams (Initial Launch and Early Growth)*

- **Service Provider Revenue Share --** Vendors and service providers who use the network to facilitate commercial transactions will contribute a 10% commission-based fee to the network.

- **Microtransaction Fees on Token Transfers** -- A tiered fee system will be implemented, ensuring sustainability while keeping tipping and small transactions frictionless.

- **NFT and Tokenized Experiences** -- Businesses and creators can offer exclusive, tokenized experiences via network-integrated NFTs, with a transaction fee (3-5%) to support network sustainability.

*Phase II: Expansion of Monetization Features (User-base Growth and dApp Ecosystem Development)*

- **Enterprise Data Insights** -- Aggregated, anonymized recommendation trends will be available as a paid enterprise service.

- **API Monetization for dApps & Enterprises** -- Businesses and developers integrating network data through high-volume API requests will access premium API tiers.

*Phase III: Long-term Sustainability and Optimization*

- **DAO Treasury and Token Buybacks** -- A portion of enterprise-generated revenue may be allocated toward token buybacks, in support long-term ecosystem sustainability and token value appreciation. Governance will vote on this possibility when stability has been achieved in terms of ecosystem health, liquidity need and long-term sustainability goals.

- **Refinement of Monetization Models --** The governance mechanism will periodically assess and refine revenue streams.

By prioritizing a phased monetization approach, the network ensures financial sustainability while supporting organic growth, developer engagement, and user-driven commerce.

### 10.6. Final Thoughts

This risk mitigation framework ensures that the network remains adaptable, secure, and user-centric, even as it navigates evolving regulations, market conditions, and scaling challenges. By implementing a dynamic governance model, strong security architecture, and sustainable monetization strategies, the project is positioned for long-term success in the decentralized recommendation space.

## 11. Competitor Analysis

Online recommendations fall into three broad camps: ad-driven centralized platforms, first-generation Web3 experiments, and pure AI engines. None combines a verifiable social graph, a Trust-Score feed, and DAG-level performance. The following comparison shows where OmeoneChain fits.

### 11.1. Centralized Platforms

Yelp, Tripadvisor, Google Reviews and Goodreads excel at scale and mainstream UX, yet their algorithms are opaque and increasingly shaped by ad budgets. Users cannot tell whether a 4.8-star rating is powered by genuine praise or by a sponsored placement, nor are authors rewarded for their effort. OmeoneChain removes ad slots entirely: ranking is an open formula (Trust = provenance × endorsement weight) and contributors earn tokens only when their advice helps someone in their social graph. In short, the network offers the reach of a big platform without the pay-to-play distortion.

### 11.2. First-generation Decentralized Alternatives

Projects such as Steemit/Hive (long-form blogs), Lens Protocol (social graph) and Presearch (tokenized search) prove that on-chain reputation can motivate content, but they lack the structured, list-centric recommendations most people want when choosing a restaurant tomorrow night. They also inherit L1 fees and five-second confirmation times. OmeoneChain's DAG ledger finalizes in seconds at near-zero cost, and the Trust-Score model is purpose-built for short, actionable tips that live inside shareable lists.

### 11.3. AI-only Models

Large-language-model planners (Google's Gemini travel planner, "ChatGPT City Guide" chatbots) generate slick itineraries but train on public corpora riddled with synthetic reviews. Their outputs lack provenance; users cannot verify who—if anyone—actually visited the bún chả stall they recommend. OmeoneChain flips the data pipeline: every tip carries a cryptographic signature and social-graph weight, giving AI modules a clean, spam-filtered dataset. The protocol even sells an optional Taste-Passport concierge that runs AI locally but anchors every recommendation to on-chain trust metadata.

### 11.4. Key Differentiators

OmeoneChain will introduce a new paradigm in recommendation systems by combining a verifiable social graph with DAG-level speed and a burn-driven token economy, creating a recommendation system where trust, performance, and incentives reinforce one another. The result is a platform that neither ad-funded incumbents nor first-generation Web3 projects can match in transparency, scalability, or user alignment. The key differentiators of the network are:

- **Social-graph Trust Score** -- ranking derives from people you follow and their reputation, not ad spend.

- **Tokenized impact** -- contributors earn only when tips reach Trust ≥ 0.25, eliminating copy-paste spam.

- **DAG throughput** -- high-frequency saves and up-votes cost fractions of a cent, enabling real-time feeds.

- **Burn-centric revenue** -- 75% of protocol fees are burned, tying value directly to usage while keeping the feed ad-free.

- **Pluggable AI & dApps** -- builders license a provenance-clean graph; the core app offers basic AI but leaves vertical depth to third-party dApps.

### 11.5. Final Thoughts

Centralized giants are losing trust; early Web3 rivals struggle with cost and usability; AI models drown in noisy data. By anchoring every tip to a verifiable identity, rewarding impact with tokens, and burning a majority of protocol income, OmeoneChain delivers a transparent, self-reinforcing alternative that bridges mainstream convenience and decentralized fairness.

## 12. Community and Ecosystem Development

OmeoneChain's go-to-market is built around one principle: Let trust-weighted word-of-mouth spread city by city, niche by niche, until the graph reaches escape velocity. The plan unfolds in three overlapping tracks, early adopters, builders, and strategic partners, with each one fueled by the same token incentives and burn-centric revenue model described in Section 5.

### 12.1. Early-Adopter Flywheel

Go-to-market begins with two pilot cities chosen through a five-factor rubric (food density, legacy-platform saturation, crypto friendliness, English reach, warm partner leads). Current front-runners include Lisbon, São Paulo, Miami, Buenos Aires and Singapore; final selection will follow on-the-ground partner commitments. The aim is to seed dense social graphs rather than thin global noise.

- Starter Pack and high emission rate before the first halving give early contributors outsized upside.

- City Quests (NFT badges + leaderboard prizes) reward the first 500 tips that hit Trust 0.25 in each neighborhood.

- Taste-Twin Concierge bundles are free for the first 1,000 travelers, showcasing premium utility without paywalls.

Content-driven marketing—chef AMAs, "How we stop AI-slop" blog posts, short-form reels—replaces paid ads and pushes the narrative of transparent, human trust.

### 12.2. Developer Incentives

A 16% Ecosystem Fund disburses grants and bounties; all awards are paid 75% in unlocked TOK and 25% in a six-month vest to anchor long-term commitment. Highlighted tracks:

- Open-source UI components that surface Trust-Score badges;

- AI modules that plug into the Taste Passport marketplace;

- integrations with Web3 socials and on-chain booking rails.

Early contributors receive gated API keys, subsidized indexer nodes, and a share of Taste-Passport fees (80/20 split in their favor).

### 12.3. Vendor, Influencer & Platform Partnerships

Vendors never pay for ranking, but they can monetize through NFT tickets, loyalty passes, and data dashboards. The pilot cohort (20 restaurants per city) is onboarded with full hand-holding:

- Mint reservation NFTs (protocol fee 3--5%, 75% burned);

- host "token-gated" pop-ups promoted via city quests;

- receive aggregated, anonymized feedback dashboards after 30 days.

Influencers and critics join via a verified-expert program: they stake 100 TOK, pass KYC, and share 90% of premium-list revenue. Parallel integrations with Lens, Farcaster, and selected travel-tech apps pipe Trust-Score snippets into wider feeds, driving token demand without fragmenting conversation.

### 12.4. Road-map Milestones

| **Milestone**    | **Target**                     | **Unlock**                         |
|------------------|--------------------------------|------------------------------------|
| **Dense Graph**  | 10,000 trusted ties per pilot city | Grants Phase II; fee subsidy taper begins |
| **Builder Traction** | 25 third-party dApps, ≥ 5,000 MAU | Ecosystem Fund annual refill vote |
| **Vendor ROI**   | 100 businesses with ≥ 20 NFT sales | Roll-out to three new verticals |
| **Liquidity**    | $10M on-chain depth            | DAO gains fee-parameter control |

Governance progresses as outlined in Section 7: more staked wallets and more external audits translate into broader community authority.

### 12.5. Final Thoughts

Early contributors earn higher rewards; builders capture new revenue streams; vendors monetize authentically; and every paid action burns tokens, tightening supply while the network grows. By anchoring go-to-market in word-of-mouth economics rather than ad spend, OmeoneChain aligns every stakeholder around the same objective: Trustworthy recommendations that compound in value as the graph expands.

## 13. Legal and Regulatory Considerations

The network is designed to operate within a rapidly evolving regulatory landscape, ensuring compliance with cryptocurrency laws, data protection regulations, and intellectual property rights while maintaining the core principles of decentralization, transparency, and user autonomy. Its architecture therefore separates public ledger activity from off-chain fiat ramps and limits the protocol's custody of user data. Core principles of the network—decentralization, transparency, user autonomy—are preserved even as compliance obligations are met. Given the global nature of the network, the legal framework will be adaptive and jurisdictionally flexible, ensuring that operations align with applicable laws in key markets.

### 13.1. KYC/AML

The network itself never touches fiat. Users earn and spend TOK freely on-chain; when they wish to convert to cash they pass through a licensed exchange or on-ramp that performs full KYC/AML. Vendor payouts follow the same pattern:

- A restaurant selling NFT tickets receives TOK in-app;

- if it converts to fiat, the exchange handles identity checks and reporting.

Escrow smart-contracts used for Taste-Twin bundles and AI concierge fees are non-custodial—funds are locked on-chain until trust conditions are met, then released automatically. This keeps OmeoneChain outside money-transmitter definitions in most jurisdictions.

### 13.2. Intellectual Property and Data

Another critical legal consideration involves intellectual property rights and data ownership for user-generated recommendations. Users will retain copyright to full-text reviews and photos stored off-chain (IPFS / Arweave). Only hashed pointers and engagement metrics live on the DAG ledger, ensuring immutability without bloating the chain. Authors may edit or remove the off-chain payload, but the on-chain hash provides a tamper-evident history. To align with its decentralized ethos, the network will prioritize openness and accessibility rather than implementing strict anti-scraping protections. Its open-date stance will be the following:

- No paywalls or anti-scraping filters—the ledger is public.

- Future protection, if needed, will rely on hash-watermarking to spot large-scale plagiarism without locking content behind walls.

### 13.3. Revenue Burns and Securities Risk

Seventy-five per-cent of protocol income is routed to a burn address, the remainder to operating treasury. Because burns are not automatic dividends to token-holders, preliminary counsel indicates the token stays on the "utility" side of Howey in most venues. Even so, the DAO can vote to pause or lower burn ratios should future guidance equate predictable burns with security-like returns.

### 13.4. Jurisdictional and Entity Structure

OmeoneChain will operate through a dual-entity model: a non-profit foundation that holds treasury keys and publishes reports, and a for-profit operating company that hires staff, manages exchange listings, and administers grants. Candidate jurisdictions are those that already provide clear digital-asset rules and pragmatic tax frameworks:

- **Switzerland (Association / Foundation)** -- well-tested DAO structures, FINMA guidance on utility tokens, strong reputation for transparency.

- **Cayman Islands (Foundation Company)** -- flexible governance, zero corporate tax, recognized by most centralized exchanges.

- **Panama (Private Interest Foundation)** -- no income tax on foreign-sourced crypto gains, streamlined registration, and data-protection statutes broadly aligned with GDPR.

- **Portugal (Sociedade Lda.)** -- crypto-friendly banking relationships, favorable personal-tax regime for contributors.

Under this plan the foundation—Swiss, Cayman, or Panamanian—custodies the on-chain treasury and executes quarterly burns, while the Portuguese OpCo handles fiat payroll and vendor outreach. All entities commit to:

- GDPR / LGPD compliance for any user-facing off-chain data,

- FATF travel-rule APIs on large vendor cash-outs, and

- MiCA-style utility-token disclosures when servicing EU users.

This blend offers regulatory clarity, exchange compatibility, and cost efficiency, while keeping governance open to future relocation should legislative landscapes shift.

### 13.5. Final Thoughts

The legal and regulatory framework of the network is designed to ensure compliance without imposing significant costs on the operation of the network or compromising decentralization. By outsourcing fiat ramps, anchoring IP rights off-chain, and burning (rather than distributing) protocol revenue, OmeoneChain minimises custodial and securities exposure while retaining a fully transparent, user-owned ledger. Continuous legal review will keep the network aligned with evolving global standards without diluting its decentralized ethos.

## 14. Conclusion

OmeoneChain re-imagines the online recommendation space by transforming scattered word-of-mouth into a verifiable, searchable, and rewarding social graph. Instead of five-star averages and opaque ad bidding, every tip is time-stamped on a high-throughput DAG, ranked by personal Trust Score, and rewarded only when it proves useful to someone inside the author's circle. This impact-first model breaks the spam-and-inflation cycle that plagues legacy review sites and gives AI modules a clean, provenance-rich data set, turning "AI-slop" into personalized discovery.

A fixed 10 billion-token supply, halving schedule, and trust-weighted reward curve create long-term economic sustainability without pay-for-placement. Vendors engage through NFT tickets and loyalty passes rather than ads, while an open dApp layer lets developers build niche recommenders, analytics dashboards, and AI taste-matching engines on top of the same graph. Governance begins with a lean core team but shifts toward community control as staking, usage, and liquidity milestones are reached.

For users, this means tailored recommendations surfaced by people they already trust—and a share of the value they create. For businesses, it offers visibility earned through quality, not marketing budgets. For builders, it provides an auditable foundation on which to innovate without gatekeepers.

With the MVP slated for 2025 and a clear migration path should the base ledger ever falter, OmeoneChain is technically ready and strategically timed. We invite reviewers, developers, and forward-thinking vendors to join the early cohort and help prove that verifiable social trust can outshine synthetic stars, promoting a fairer, human-centered discovery economy.

## Appendix I: Roadmap

The network's development roadmap follows a strategic and accelerated timeline, ensuring a faster time-to-market while maintaining technical stability and scalability. The goal is to deploy the core network efficiently, leveraging existing DAG frameworks where possible, while allowing for iterative refinements based on real-world usage.

### Phase 1: White Paper & Early Development (Q1 - Q2 2025)

With the White Paper near completion, the focus shifts to **early-stage development** and securing key technical partnerships.

- Q1 2025:

  - Finalization and publication of the White Paper.

  - Engaging early adopters, developers, and technical advisors for feedback.

  - Selection of DAG framework (leveraging existing solutions like IOTA Rebased or Constellation where applicable).

  - Formation of the core development team and alignment with early partners.

- **Q2 2025:**

  - MVP development begins, focusing on the recommendation engine, token economy, and initial UI.

  - Setting up test environments for security, performance, and storage efficiency evaluations.

  - Early-stage governance discussions to refine voting and moderation mechanisms.

  - Design and stub Chain-adapter interface (Rebased + Mock).

### Phase 2: MVP Launch & Private Beta Testing (Q3 - Q4 2025)

With core functionalities in place, the focus shifts to testing and refining the network before a broader rollout.

- **Q3 2025:**

  - Private MVP launch, allowing invited testers to provide feedback.

  - Iterative improvements to data storage, token reward distribution, and DAG validation.

  - First governance discussions with early adopters regarding network policies.

  - Implement EVM-Adapter (L2 fallback) + unit tests.

  - Closed-Alpha Milestone (Q3 2025). A 3-week, invite-only usability test on a mock ledger: seeded dataset, no real tokens, and a Postgres event log. Success criteria: 500 new recommendations, up-vote/down-vote ratio ≥ 4, and ≥ 70% of testers expressing willingness to invite peers. Outcomes feed directly into emission-rate finalization and onboarding UX polish before the public beta.

- **Q4 2025:**

  - Public beta launch, giving a wider audience access to the network.

  - Enhancing personalization, search capabilities, and reputation-based ranking.

  - Initial enterprise partnerships for API integrations and business engagement.

### Phase 3: Mainnet Deployment & Ecosystem Expansion (Q1 - Q2 2026)

Following the successful beta, the network will transition to full deployment, focusing on scalability, governance, and monetization.

- **Q1 2026:**

  - Final pre-mainnet optimizations, ensuring network stability and security.

  - Implementing community-driven governance, allowing early token staking for governance participation.

  - Expanding token reward mechanisms to align with real-world engagement data.

  - Run migrator dry-run: export test-net state, import on L2.

- **Q2 2026:**

  - Mainnet deployment, fully launching the decentralized recommendation ecosystem.

  - Enterprise API partnerships begin to scale, allowing external networks to integrate recommendation data.

  - Launch of multi-category recommendations, allowing users to expand network utility.

### Phase 4: Scaling, Monetization & Global Adoption (Q3 2026 and beyond)

With the network fully operational, the next phase focuses on user acquisition, revenue scaling, and decentralization of governance.

- **Q3 - Q4 2026:**

  - Strengthening vendor engagement, enabling businesses to interact with users transparently.

  - Refining data insights monetization to ensure network sustainability without compromising user trust.

  - Continued enhancements to DAG performance, storage costs, and data security.

- **2027 and Beyond:**

  - Further decentralization of governance, allowing the community to take a larger role in network evolution.

  - Expanding into global markets, onboarding international contributors and enterprises.

  - Exploring additional revenue models (e.g., deeper enterprise integrations, NFT-based reputation verification).

The roadmap accelerates network deployment, ensuring that early users and businesses can engage sooner, while maintaining flexibility for future scalability and decentralization. By leveraging existing DAG frameworks, focusing on rapid testing cycles, and implementing community-driven refinements, the network is positioned for long-term success while maintaining a high-quality user experience.

## Appendix II: Reward Pool and Fee-Sensitivity Model

| **Scenario**   | **Users -- Year 1** | **Annual user-growth (%)** | **Avg actions /user/day** | **Micro-fee per action (µMIOTA)** | **Reward tokens paid /yr¹** | **Fee burn / yr (MIOTA)** | **Years until pool depleted** |
|----------------|---------------------|----------------------------|---------------------------|----------------------------------|----------------------------|-----------------------|------------------------------|
| Conservative   | 5,000               | **+25%**                   | 8                         | 0.05                             | 33 M                      | 73 M                  | **46 yr**                    |
| Baseline       | 10,000              | **+50%**                   | 12                        | 0.05                             | 66 M                      | 219 M                 | **18 yr**                    |
| Aggressive     | 50,000              | **+100%**                  | 20                        | 0.05                             | 198 M                     | 365 M                 | **9 yr**                     |
| Hyper-growth   | 100,000             | **10x Y1-Y2, then 2x**     | 24                        | 0.05                             | 390 M                     | 4,380 M               | **6 yr**                     |

***¹** Reward curve applies the scheduled halvings. Figures shown are Year-1 emissions; later years decline as halvings trigger.*

### II-A. Managing runaway adoption

If usage tracks—or exceeds—the Aggressive curve earlier than forecast, the community treasury retains several levers to preserve pool longevity without compromising user experience:

1. **Engagement-Booster Pool.** Governance may authorize a separately capped "Booster Pool," funded from future service-provider fees or treasury surplus to top-up micro-rewards during periods of explosive growth. This pool is independent of the original 5.2 B token emission schedule, so the core supply cap and halving timeline remain intact.

2. **Opt-in monetization.** Service-provider "featured spots" or lightweight in-app sponsorships can be enabled, directing a share of that revenue either to the Booster Pool or to offset sponsor-wallet fee outflows.

3. **Off-chain batching for micro-signals.** Extremely high-frequency, low-value actions (e.g., 'likes') can be recorded off-chain, batched hourly into a Merkle root, and anchored on the DAG. Users retain their verifiable history, but on-chain fee and reward costs drop by an order of magnitude.

These levers are deliberately reserved for high-growth contingencies and require on-chain governance approval, ensuring that early-stage economic assumptions remain intact unless the community collectively opts for adjustment.

## Appendix III: Off-Chain Storage Cost Model

### III-A. Data-Footprint Assumptions

- **Payload size.** Average recommendation: 2 kB JSON + one 1,024 × 768 image compressed to WebP ≈ 58 kB.

- **Rich media.** 15% of recommendations include a short video thumbnail (500 kB).

- **Redundancy.** Content is pinned on three geographically distinct nodes (2× IPFS + 1× Aleph.im).

- **Annual data-retention.** All media are retained indefinitely to guarantee verifiable history.

### IV-B. Adoption Scenarios (aligned with Appendix II)

| **Scenario**   | **Year-1 users** | **Growth / yr** | **Recs / user / day** | **TB stored by end-Y3** |
|----------------|------------------|-----------------|------------------------|-------------------------|
| Conservative   | 5k               | +25%            | 0.8                    | 0.43                    |
| Baseline       | 10k              | +50%            | 1.2                    | 0.86                    |
| Aggressive     | 50k              | +100%           | 2.0                    | 3.4                     |

### IV-C. Provider Price Benchmarks ⁽¹⁾

| **Provider**           | **Cost / GB-month** | **Retrieval**              | **Notes**                                                   |
|------------------------|---------------------|----------------------------|-------------------------------------------------------------|
| **Pinata Cloud (Business)** | $0.15 + $0.02 per pin | Free bandwidth up to 100 GB/mo | Fully managed IPFS                                         |
| **Aleph.im Resource Node (staked)** | ≈ $0.05             | Included                    | Requires 50k ALEPH stake; node can be delegated            |
| **Filecoin (Fil+ programme)** | $0.002 (3-mo deal)   | $0.03 / GB                 | Low cost, higher latency; good for cold archives            |

### IV-D. Five-Year Cost Projection (Baseline scenario, Aleph.im primary)

| **Year** | **Users** | **Data stored (TB)** | **Cost (USD)** | **Cost as % of projected revenue ⁽²⁾** |
|----------|-----------|----------------------|----------------|----------------------------------------|
| 1        | 10k       | 0.26                 | $3,100         | 5%                                     |
| 2        | 15k       | 0.47                 | $5,600         | 4%                                     |
| 3        | 22k       | 0.86                 | $10,200        | 4%                                     |
| 4        | 33k       | 1.60                 | $19,200        | 4%                                     |
| 5        | 50k       | 3.10                 | $36,500        | 3%                                     |

*Storage remains below 5% of operating income across scenarios; full spreadsheet is available in models/storage-model.xlsx.*

### IV-E. Mitigation Levers

1. **Media optimization.** Enforce WebP at ≤ 50 kB; videos off-loaded to user-hosted platforms, storing only the hash.

2. **Dynamic redundancy.** Drop to two pins for aged (> 2 yr) content if utilization spikes.

3. **Usage-based tier.** Service providers with heavy media loads can opt-in to a paid "high-fidelity" tier; proceeds flow to the Storage Fund.

### IV-F. Re-evaluation Policy

Pricing is reviewed every six months. If projected storage OPEX exceeds 8% of trailing-12-month revenue, the treasury is required to:

- solicit at least two new provider quotes,

- propose a cost-mitigation vote (tiered fees, bandwidth throttling, or provider swap), and

- publish comparison metrics (latency, durability, retrieval fees).

This policy ensures storage costs remain transparent, predictable, and proportionate to platform income.

**Footnotes**

1. Pricing as of April 2025; sources: provider dashboards and email quotes on file.

2. Revenue assumes 10% commission on vendor NFTs / featured spots, per Section 5.4.

## Appendix IV: References

The network's design and conceptual framework are informed by a combination of blockchain research, decentralized governance principles, and the critical evaluation of existing recommendation systems. Below are key references and sources that influenced various aspects of this white paper:

1. Dixon, Chris. Read, Write, Own: Building the Next Era of the Internet (2024). A key resource on the evolution of Web3 and the potential for decentralized platforms to disrupt traditional, centralized internet services.

2. Nakamoto, Satoshi. Bitcoin: A Peer-to-Peer Electronic Cash System (2008). The foundational white paper outlining Bitcoin's decentralized ledger and fixed supply model, which inspired the principles of token scarcity and governance in this platform.

3. Ethereum White Paper. Ethereum: A Next-Generation Smart Contract and Decentralized Application Platform (2013). A crucial reference for understanding smart contracts, decentralized applications (dApps), and tokenized incentive structures.

4. IOTA White Paper & Technical Documentation. The Tangle: A Scalable, Decentralized, and Feeless Distributed Ledger (2017). Key insights into the efficiency and scalability of DAG-based architectures, influencing the platform's choice of blockchain framework.

5. Constellation Network Documentation. Constellation: A Scalable DAG Protocol for Big Data Validation and Processing. An important reference for understanding data validation in decentralized networks and how DAGs can enhance scalability and security.

6. Existing Recommendation Platforms: The platform critically analyzes and seeks to improve upon centralized review systems such as Yelp, Google Reviews, and Tripadvisor, which suffer from opaque ranking algorithms, potential manipulation, and a lack of user-driven incentives.

7. Additional Industry Resources: Various articles, case studies, and reports on blockchain governance, tokenomics, and decentralized applications were consulted during the development of this platform. These include open-source materials from the Ethereum Foundation, IOTA Foundation, and research publications on DAG structures and decentralized reputation systems.

To ensure transparency and provide further context, relevant white papers and technical documentation can be accessed at the following links:

- Bitcoin White Paper

- [Ethereum White Paper](https://ethereum.org/en/whitepaper/)

- IOTA Documentation

- [Constellation Network](https://constellationnetwork.io/)

This reference section serves as a foundation for the platform's technical and conceptual development, grounding its approach in established blockchain principles while pushing forward the evolution of decentralized recommendation systems.

https://www.weforum.org/stories/2021/08/fake-online-reviews-are-a-152-billion-problem-heres-how-to-silence-them/

https://www.socialpilot.co/reviews/blogs/spot-fake-google-reviews

https://www.phocuswire.com/Tripadvisor-blocks-record-2-million-fake-reviews-in-2023

[^1]: The IOTA Foundation has now fixed the Rebased main‑net launch for 05‑05‑2025 and published validator, wallet and exchange readiness details, materially lowering timeline risk. https://blog.iota.org/rebased-mainnet-upgrade/
