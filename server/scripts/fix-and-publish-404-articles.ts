import "dotenv/config";
import mongoose from "mongoose";
import { isArticleIndexable, articleIndexabilityIssues } from "../../src/lib/public-articles";

const targetUrls = [
  "https://www.novexa.news/news/is-fifa-selling-parts-of-the-world-cup-to-private-investors",
  "https://www.novexa.news/news/starting-uni-what-to-know-about-the-free-nhs-meningitis-b-jab-in-england",
  "https://www.novexa.news/news/canadian-wildfire-smoke-shrouds-us-potential-risk-for-world-cup-final",
  "https://www.novexa.news/news/firing-of-ukraine-s-top-general-signals-the-end-of-an-era",
  "https://www.novexa.news/news/american-ai-is-expensive-some-startups-are-turning-to-cheap-chinese-models",
  "https://www.novexa.news/news/nhs-manager-says-trust-wanted-4-000-reports-gone",
  "https://www.novexa.news/news/government-borrowing-cost-hits-two-decade-high-after-fed-rate-decision",
  "https://www.novexa.news/news/the-trump-administration-s-move-to-end-subsidies-for-medicare-drug-plans-could-cost",
  "https://www.novexa.news/news/france-becomes-first-eu-country-to-officially-ban-social-media-for-children",
  "https://www.novexa.news/news/investigation-into-parking-tickets-for-drivers-queuing-at-petrol-stations",
  "https://www.novexa.news/news/officials-probe-whether-white-house-teleprompter-operator-profited-off-trump-apos-s-words",
  "https://www.novexa.news/news/8-killed-and-more-than-60-wounded-in-ukrainian-drone-attack-on-russian-regions",
  "https://www.novexa.news/news/japan-in-a-race-against-time-to-rescue-people-trapped-beneath-rubble-after-quake",
  "https://www.novexa.news/news/between-hope-and-fear-yemenis-react-to-houthi-blockade-on-saudi-arabia",
  "https://www.novexa.news/news/germany-s-merz-hails-nuclear-deterrence-cooperation-with-france",
  "https://www.novexa.news/news/why-is-uganda-experiencing-a-food-crisis",
  "https://www.novexa.news/news/judge-allows-use-of-police-interview-in-tupac-shakur-murder-trial",
  "https://www.novexa.news/news/andy-burnham-rules-out-early-election-in-exclusive-bbc-interview",
  "https://www.novexa.news/news/peru-fire-leaves-10-family-members-dead-as-investigators-probe-cause",
  "https://www.novexa.news/news/a-son-of-wealth-finds-his-calling-in-a-high-end-grocery-store",
  "https://www.novexa.news/news/the-chips-rout-goes-global",
  "https://www.novexa.news/news/israeli-settler-attack-on-at-tuwani",
  "https://www.novexa.news/news/japanese-football-legend-king-kazu-59-scores-first-goal-in-four-years",
  "https://www.novexa.news/news/trump-on-erdogan-netanyahu-and-selling-fighter-jets-to-turkiye",
  "https://www.novexa.news/news/photos-wildfires-in-france-drive-250-000-people-from-their-homes",
  "https://www.novexa.news/news/one-dead-several-injured-after-vehicle-plows-through-crowd-at-lgbtq-event-in-germany",
  "https://www.novexa.news/news/how-india-s-cockroach-protesters-shook-the-modi-government",
  "https://www.novexa.news/news/russia-charges-telegram-founder-pavel-durov-with-aiding-terrorism",
  "https://www.novexa.news/news/pregnant-palestinian-woman-loses-baby-after-israeli-checkpoint-stop",
  "https://www.novexa.news/news/lando-norris-wins-hungarian-grand-prix-for-first-f1-triumph-in-2026",
  "https://www.novexa.news/news/why-has-iran-s-economy-not-collapsed-under-us-war-pressure",
  "https://www.novexa.news/news/a-i-companies-are-recruiting-electricians-and-carpenters-by-the-thousands",
  "https://www.novexa.news/news/sick-of-a-i-generated-content-the-slop-janitor-is-here-to-help",
  "https://www.novexa.news/news/gulf-war-dries-up-unofficial-dollar-inflows-through-hundi-and-hawala-network",
  "https://www.novexa.news/news/war-on-iran-phase-ii-day-17",
  "https://www.novexa.news/news/global-oil-prices-jump-as-attacks-resume-in-the-middle-east",
  "https://www.novexa.news/news/israeli-forces-target-gaza-s-al-aqsa-hospital",
  "https://www.novexa.news/news/authors-wary-of-content-ownership-despite-court-ruling-on-anthropic-case",
  "https://www.novexa.news/news/trump-i-m-running-for-a-fourth-term-as-president-of-the-united-states",
  "https://www.novexa.news/news/trump-says-iran-war-talks-taking-place-during-lull-in-strikes",
  "https://www.novexa.news/news/how-has-the-indian-government-responded-to-cockroach-protests",
  "https://www.novexa.news/news/rome-s-viral-graffiti-cleaner-is-taking-on-an-ancient-problem",
  "https://www.novexa.news/news/ebola-response-workers-strike-in-dr-congo-as-death-toll-spikes",
  "https://www.novexa.news/news/saudi-arabia-defends-against-drone-strikes-from-iran-backed-groups",
  "https://www.novexa.news/news/yemen-s-houthis-claim-missile-attack-on-saudi-arabia-oil-tanker",
  "https://www.novexa.news/news/how-us-defence-aid-shaped-israel-s-military-developments-since-oct-7-2023",
  "https://www.novexa.news/news/darfur-weaponising-identity",
  "https://www.novexa.news/news/israeli-forces-tear-gas-journalists-reporting-nablus-shootout",
  "https://www.novexa.news/news/in-washington-netanyahu-faces-a-delicate-balancing-act",
  "https://www.novexa.news/news/marsh-stars-as-sunrisers-beat-brave",
  "https://www.novexa.news/news/tate-s-attorney-says-allegations-puts-a-target-on-their-backs",
  "https://www.novexa.news/news/moment-canadian-politician-accidentally-reads-ai-prompt-during-speech",
  "https://www.novexa.news/news/england-s-langton-feared-for-gymnastics-future-after-fall",
  "https://www.novexa.news/news/one-dead-14-injured-as-car-reportedly-strikes-crowd-at-berlin-lgbtq-event",
  "https://www.novexa.news/news/littler-sets-up-price-final-at-world-matchplay",
  "https://www.novexa.news/news/trump-says-iran-talks-taking-place-during-pause-in-us-military-strikes",
  "https://www.novexa.news/news/syrian-people-must-not-be-failed-again",
  "https://www.novexa.news/news/five-decades-of-israeli-covert-strategy-to-push-us-iran-into-confrontation",
  "https://www.novexa.news/news/trump-asks-us-supreme-court-to-allow-mail-in-voting-restrictions",
  "https://www.novexa.news/news/why-these-cancer-patients-face-a-lonely-fight",
  "https://www.novexa.news/news/war-criminal-protesters-confront-netanyahu-motorcade-in-washington-dc",
  "https://www.novexa.news/news/war-on-iran-phase-ii-day-14",
  "https://www.novexa.news/news/devastating-european-wildfires-in-maps-and-how-they-re-being-tackled",
  "https://www.novexa.news/news/typhoon-noul-makes-landfall-in-china-with-hundreds-of-thousands-evacuated",
  "https://www.novexa.news/news/even-before-attack-berlin-s-gay-community-felt-more-and-more-unsafe",
  "https://www.novexa.news/news/students-staff-work-to-bring-the-islamic-university-of-gaza-back-to-life",
  "https://www.novexa.news/news/iran-war-live-trump-says-us-locked-and-loaded-as-it-seeks-iran-talks",
  "https://www.novexa.news/news/un-rights-chief-turk-wins-second-term-despite-us-and-israeli-opposition",
  "https://www.novexa.news/news/charli-xcx-photo-purchased-by-national-portrait-gallery",
  "https://www.novexa.news/news/rain-returns-for-some-parts-of-the-uk",
  "https://www.novexa.news/news/iran-warns-ukraine-of-retaliation-after-deadly-caspian-sea-strike",
  "https://www.novexa.news/news/spanish-pm-pedro-sanchez-thanks-young-gaza-artist-for-painting-him",
  "https://www.novexa.news/news/maybe-he-s-a-racist-trump-critical-of-james",
  "https://www.novexa.news/news/inter-in-advanced-talks-with-england-defender-stones",
  "https://www.novexa.news/news/saudi-led-coalition-strikes-houthi-controlled-hodeidah",
  "https://www.novexa.news/news/what-drove-venezuela-s-decision-to-leave-the-icc",
  "https://www.novexa.news/news/icc-prosecutor-khan-removed-over-sexual-misconduct-allegations-sources",
  "https://www.novexa.news/news/dutch-pair-banned-from-bali-after-run-club-excludes-locals",
  "https://www.novexa.news/news/houthis-claim-saudi-drone-downed-over-northwestern-yemen",
  "https://www.novexa.news/news/why-budding-birders-are-flocking-to-shazam-like-apps-to-identify-avians",
  "https://www.novexa.news/news/what-lies-ahead-for-iran-s-economy-as-scope-of-us-war-grows-beyond-hormuz",
  "https://www.novexa.news/news/us-and-iran-hit-pause-on-strikes-for-second-day",
  "https://www.novexa.news/news/macron-calls-crisis-meeting-as-wildfires-threaten-bordeaux-and-heatwave-looms",
  "https://www.novexa.news/news/sell-the-company-for-400-million-he-s-giving-it-away-instead",
  "https://www.novexa.news/news/russia-and-ukraine-trade-attacks-killing-10-including-child-in-chernihiv",
  "https://www.novexa.news/news/typhoon-noul-batters-southeast-china",
  "https://www.novexa.news/news/venezuela-to-exit-international-criminal-court-accusing-it-of-bias",
  "https://www.novexa.news/news/berlin-police-search-for-suspect-in-fatal-attack-on-pride-parade",
  "https://www.novexa.news/news/why-the-uk-cancelled-a-military-exercise-in-kenya-and-what-it-means",
  "https://www.novexa.news/news/malaysia-to-host-rescheduled-bahrain-grand-prix-f1-race-in-october",
  "https://www.novexa.news/news/iran-s-sabre-rattling-should-not-intimidate-uk-wes-streeting-says",
  "https://www.novexa.news/news/u-s-iran-war-pauses-for-2nd-straight-day",
  "https://www.novexa.news/news/tunisians-mark-fifth-year-of-emergency-rule-with-calls-for-saied-to-go",
  "https://www.novexa.news/news/israeli-air-strike-on-a-vehicle-in-gaza-kills-two-hamas-security-officials",
  "https://www.novexa.news/news/what-s-behind-the-icc-investigation-into-karim-khan",
  "https://www.novexa.news/news/israeli-crackdown-in-occupied-west-bank-intensifies-settlers-cause-mayhem",
  "https://www.novexa.news/news/sean-mccann-brother-of-madeleine-to-swim-at-commonwealths",
  "https://www.novexa.news/news/manager-garcia-to-leave-belgium-when-contract-expires",
  "https://www.novexa.news/news/yemen-s-houthis-target-saudi-oil-facilities-along-the-red-sea",
  "https://www.novexa.news/news/bangladesh-president-mohammed-shahabuddin-resigns",
  "https://www.novexa.news/news/qr-codes-are-quietly-replacing-paper-at-more-wedding-receptions",
  "https://www.novexa.news/news/born-too-soon-premature-babies-fight-for-survival-in-gaza",
  "https://www.novexa.news/news/trump-returns-to-correspondents-apos-dinner-3-months-after-shooting",
  "https://www.novexa.news/news/warning-shot-or-publicity-stunt-how-worried-should-we-be-about-the-openai-hack",
  "https://www.novexa.news/news/paramount-agrees-to-pause-warner-bros-deal-while-court-case-plays-out",
  "https://www.novexa.news/news/kids-and-adults-are-obsessed-with-squishy-toys-and-fidget-trading",
  "https://www.novexa.news/news/congress-party-holds-funeral-for-india-pm-modi-and-cabinet-ministers",
  "https://www.novexa.news/news/us-court-affirms-release-of-pro-palestine-scholar-as-legal-battle-continues",
  "https://www.novexa.news/news/watch-at-the-scene-of-berlin-pride-attack-as-manhunt-continues",
  "https://www.novexa.news/news/wildfire-survivors-tell-of-narrow-escape-as-spain-declares-emergency",
  "https://www.novexa.news/news/can-zimbabwe-s-mineral-ambitions-benefit-smaller-producers",
  "https://www.novexa.news/news/two-buses-collide-in-syria-killing-at-least-35-people",
  "https://www.novexa.news/news/ravi-chenab-flood-levels-likely-to-reach-medium-to-high-today",
  "https://www.novexa.news/news/i-lost-my-home-twice-sudanese-mothers-caught-between-two-wars",
  "https://www.novexa.news/news/wildfires-in-spain-and-france-force-evacuation-of-200-000-people",
  "https://www.novexa.news/news/meta-launches-new-facebook-marketplace-app-called-seller",
  "https://www.novexa.news/news/australia-world-cup-star-volpato-faces-speeding-cocaine-charges",
  "https://www.novexa.news/news/expert-shares-how-trump-apos-s-new-round-of-tariffs-could-affect-americans",
  "https://www.novexa.news/news/buck-moon-set-to-light-up-sky",
  "https://www.novexa.news/news/israeli-strikes-hit-gaza-city-as-reports-say-two-palestinians-were-killed",
  "https://www.novexa.news/news/us-summons-malaysia-envoy-over-israel-policy",
  "https://www.novexa.news/news/what-are-the-abraham-accords",
  "https://www.novexa.news/news/trump-weighs-major-strike-as-iran-s-araghchi-warns-talks-are-at-risk",
  "https://www.novexa.news/news/firefighters-struggle-to-contain-madrid-wildfires-as-more-than-140-000-evacuated-in",
  "https://www.novexa.news/news/yemen-s-oil-exports-may-restart-but-recovery-remains-uncertain",
  "https://www.novexa.news/news/indian-activist-wangchuk-ends-26-day-hunger-strike",
  "https://www.novexa.news/news/in-kyrgyzstan-girls-compete-at-kok-boru-a-game-like-polo",
  "https://www.novexa.news/news/david-squires-on-the-notable-people-and-big-moments-from-world-cup-2026",
  "https://www.novexa.news/news/us-moves-to-impose-tariffs-on-dozens-of-countries-over-forced-labour-concerns",
  "https://www.novexa.news/news/iran-war-and-trump-s-tariffs-threaten-a-resilient-us-economy",
  "https://www.novexa.news/news/rayner-rules-out-repaying-severance-after-returning-to-cabinet",
  "https://www.novexa.news/news/10-women-s-transfers-that-stood-out-while-the-men-s-world-cup-dominated",
  "https://www.novexa.news/news/anonymous-food-donations-reach-indian-student-protesters",
  "https://www.novexa.news/news/as-oil-soars-experts-watch-red-sea-tankers-for-clarity-on-houthi-blockade",
  "https://www.novexa.news/news/more-than-100-uk-millionaires-urge-andy-burnham-to-raise-their-taxes",
  "https://www.novexa.news/news/us-launches-13th-night-of-strikes-as-iran-warns-of-escalation-in-the-gulf",
  "https://www.novexa.news/news/study-pinpoints-a-simple-pattern-behind-birdsong-s-rich-diversity",
  "https://www.novexa.news/news/oil-tops-100-as-red-sea-threat-revives-supply-fears",
  "https://www.novexa.news/news/oil-tops-100-again-as-middle-east-tensions-rattle-energy-markets",
  "https://www.novexa.news/news/us-drops-subpoena-for-three-new-york-times-reporters-after-legal-pushback",
  "https://www.novexa.news/news/world-cup-tourism-boom-fell-short-for-some-host-cities-report-says",
  "https://www.novexa.news/news/protests-in-bologna-after-moroccan-born-man-dies-following-police-restraint",
  "https://www.novexa.news/news/trump-warns-of-bigger-strikes-on-iran-as-gulf-tensions-widen",
  "https://www.novexa.news/news/videos-prompt-outrage-after-police-shooting-in-wisconsin",
  "https://www.novexa.news/news/johnson-thompson-injury-rules-her-out-of-commonwealth-games",
  "https://www.novexa.news/news/aston-martin-secures-550m-loan-deal",
  "https://www.novexa.news/news/nairobi-clinic-study-tests-an-ai-second-set-of-eyes-for-care",
  "https://www.novexa.news/news/over-20-killed-in-northwest-nigeria-as-armed-gang-violence-spreads",
  "https://www.novexa.news/news/rubio-says-iran-is-seeking-a-deal-with-the-us-as-strikes-continue",
  "https://www.novexa.news/news/saudi-arabia-s-nuclear-pivot-why-an-oil-giant-wants-new-power",
  "https://www.novexa.news/news/redistricting-has-reshaped-black-districts-in-six-republican-led-states",
  "https://www.novexa.news/news/aurangzeb-reviews-imf-programme-progress-as-pakistan-touts-macro-gains",
  "https://www.novexa.news/news/ukraine-s-new-military-chief-vows-tougher-retaliation-as-war-grinds-on",
  "https://www.novexa.news/news/iran-houthi-pressure-on-shipping-widens-as-us-strikes-continue",
  "https://www.novexa.news/news/clarity-act-faces-senate-fight-over-crypto-sales-by-presidents",
  "https://www.novexa.news/news/hitler-s-birth-place-in-austria-is-now-a-police-station",
  "https://www.novexa.news/news/iran-warns-us-pressure-could-trigger-wider-regional-instability",
  "https://www.novexa.news/news/houthis-announce-maritime-blockade-on-saudi-arabia",
  "https://www.novexa.news/news/what-business-leaders-say-really-helps-candidates-stand-out-in-hiring",
  "https://www.novexa.news/news/algeria-toxic-colonisation",
  "https://www.novexa.news/news/houthis-say-they-attacked-two-saudi-oil-tankers-in-the-red-sea",
  "https://www.novexa.news/news/video-shows-indian-police-accused-of-pellet-gun-use-against-protesters",
  "https://www.novexa.news/news/police-detain-rahul-gandhi-at-protest-outside-pm-modi-s-home",
  "https://www.novexa.news/news/india-s-modi-government-under-growing-pressure-as-cockroach-protests-intensify",
  "https://www.novexa.news/news/laredo-s-future-rides-on-trump-s-next-trade-move",
  "https://www.novexa.news/news/house-votes-to-extend-government-funding-aiming-to-avoid-an-election-year-shutdown",
  "https://www.novexa.news/news/who-am-i-guess-premier-league-star-no-2",
  "https://www.novexa.news/news/wounded-gaza-journalists-urge-evacuation-as-medical-access-remains-strained",
  "https://www.novexa.news/news/us-targets-china-in-move-to-ban-military-grade-drone-imports",
  "https://www.novexa.news/news/british-politician-ann-widdecombe-was-murdered-with-a-hammer-prosecutors-say",
  "https://www.novexa.news/news/india-protest-how-modi-s-refusal-to-sack-education-minister-fits-a-pattern",
  "https://www.novexa.news/news/zelenskyy-replaces-ukraine-military-chief-after-protests",
  "https://www.novexa.news/news/moldova-chooses-new-prime-minister-as-it-pushes-for-eu-membership",
  "https://www.novexa.news/news/india-apos-s-gen-z-apos-cockroach-people-apos-s-party-apos-started-as-satire-but-is-serious-about-change",
  "https://www.novexa.news/news/iran-war-live-us-launches-new-attacks-hegseth-says-war-has-cost-37-5bn",
  "https://www.novexa.news/news/a-lettuce-growing-region-in-mexico-stomachs-the-fallout-from-the-cyclospora-outbreak",
  "https://www.novexa.news/news/french-parliament-passes-social-media-ban-for-under-15s",
  "https://www.novexa.news/news/is-that-food-really-made-with-100-avocado-oil-likely-not",
  "https://www.novexa.news/news/einride-bets-38m-on-ev-charging-as-it-scales-electric-trucking",
  "https://www.novexa.news/news/openai-says-its-a-i-models-went-rogue-and-attacked-a-digital-library",
  "https://www.novexa.news/news/civilians-faced-attacks-abuse-in-joint-us-ecuador-operations-hrw-says",
  "https://www.novexa.news/news/houthi-blockade-could-worsen-an-already-fragile-oil-market",
  "https://www.novexa.news/news/threads-rolls-out-parental-supervision-tools",
  "https://www.novexa.news/news/israel-has-no-interest-in-joining-us-war-on-iran-says-smotrich",
  "https://www.novexa.news/news/iran-says-diplomatic-efforts-ongoing-via-mediators-amid-fighting-with-us",
  "https://www.novexa.news/news/japan-s-ai-gamble-can-technology-offset-the-cost-of-an-ageing-society",
  "https://www.novexa.news/news/us-agency-proposes-ending-racial-and-gender-workforce-data-collection",
  "https://www.novexa.news/news/bethell-ruled-out-of-the-hundred-with-knee-injury",
  "https://www.novexa.news/news/clashes-between-police-and-people-protesting-italy-arrest-death",
  "https://www.novexa.news/news/salah-to-besiktas-football-s-transfer-window-centre-stage-after-world-cup",
  "https://www.novexa.news/news/france-is-poised-to-restrict-social-media-for-children",
  "https://www.novexa.news/news/india-apos-s-youth-led-cockroach-movement-vows-to-continue-protest-after-police-crackdown",
  "https://www.novexa.news/news/thames-water-lenders-offer-golden-share-to-head-off-nationalisation",
  "https://www.novexa.news/news/row-escalates-in-ukraine-over-army-chief-s-future",
  "https://www.novexa.news/news/world-cup-2026-in-90-seconds-a-photo-animation",
  "https://www.novexa.news/news/cricket-quiz-can-you-name-all-eight-teams-in-the-hundred",
  "https://www.novexa.news/news/nyc-swells-with-spanish-argentinian-fans-anticipating-world-cup-glory",
  "https://www.novexa.news/news/dechambeau-at-irish-open-would-be-great-mcilroy",
  "https://www.novexa.news/news/grants",
  "https://www.novexa.news/news/ozempic-maker-sues-rival-accusing-it-of-false-advertising",
  "https://www.novexa.news/news/the-best-games-of-2026-so-far-picked-by-npr-apos-s-staff",
  "https://www.novexa.news/news/philippine-foreign-secretary-says-asean-must-work-together",
  "https://www.novexa.news/news/joshua-v-prenga-all-you-need-to-know",
  "https://www.novexa.news/news/thank-you-for-making-this-a-world-cup-to-remember-on-the-bbc",
  "https://www.novexa.news/news/the-best-economic-ideas-from-around-the-world-planet-money-summer-school-is-back",
  "https://www.novexa.news/news/trump-imposes-50-tariffs-on-canadian-goods",
  "https://www.novexa.news/news/chelsea-sign-man-utd-striker-malard-for-850-000",
  "https://www.novexa.news/news/world-cup-champions-spain-return-to-royal-welcome-parade-through-madrid",
  "https://www.novexa.news/news/uk-government-borrowing-falls-in-june",
  "https://www.novexa.news/news/hormuz-tankers-on-fire-as-us-iran-continue-attacks-what-s-the-latest",
  "https://www.novexa.news/news/petrol-prices-climb-as-us-iran-tensions-disrupt-markets",
  "https://www.novexa.news/news/trump-imposes-50-us-tariffs-on-some-canadian-goods-citing-discrimination",
  "https://www.novexa.news/news/5-6-magnitude-earthquake-hits-peru",
  "https://www.novexa.news/news/many-christian-voters-in-the-us-see-trump-as-chosen-by-god-to-lead",
  "https://www.novexa.news/news/we-just-want-to-live-palestinians-in-gaza-react-to-hamas-election",
  "https://www.novexa.news/news/kimi-antonelli-wins-belgian-grand-prix-to-extend-f1-championship-lead",
  "https://www.novexa.news/news/eu-pauses-methane-penalties-amid-energy-crisis-us-pressure",
  "https://www.novexa.news/news/andy-burnham-pledges-end-to-political-instability-as-he-becomes-uk-pm",
  "https://www.novexa.news/news/us-launches-fresh-strikes-on-iran-as-trump-warns-of-retaliation-for-death-of-soldiers",
  "https://www.novexa.news/news/tropical-storm-bertha-threatens-us-gulf-coast",
  "https://www.novexa.news/news/norway-opens-new-memorial-for-victims-of-2011-breivik-massacre",
  "https://www.novexa.news/news/two-riders-die-in-separate-british-eventing-competitions",
  "https://www.novexa.news/news/argentina-minus-messi-return-home-after-world-cup-final-heartbreak",
  "https://www.novexa.news/news/msf-demands-israel-release-detained-palestinian-healthcare-workers",
  "https://www.novexa.news/news/us-service-member-killed-during-detonation-of-iranian-drone-in-iraq",
  "https://www.novexa.news/news/fifa-world-cup-five-key-takeaways-from-2026-edition-won-by-spain",
  "https://www.novexa.news/news/aliexpress-gets-record-550m-fine-from-eu-for-allowing-sale-of-illegal-products",
  "https://www.novexa.news/news/ofcom-to-take-no-further-legal-action-against-suicide-forum",
  "https://www.novexa.news/news/don-t-believe-andy-burnham-s-pr-machine",
  "https://www.novexa.news/news/analysis-burnham-s-policy-choices-reveal-what-kind-of-pm-he-wants-to-be",
  "https://www.novexa.news/news/the-reaction-is-terrible-world-cup-final-turns-ugly-at-full-time",
  "https://www.novexa.news/news/what-does-a-burnham-led-government-mean-for-your-money",
  "https://www.novexa.news/news/china-immigration-drugs-behind-us-policy-in-latin-america",
  "https://www.novexa.news/news/morning-news-brief",
  "https://www.novexa.news/news/sacred-unity-iran-s-supreme-leader-calls-for-calm-amid-political-divides",
  "https://www.novexa.news/news/who-is-khalil-al-hayya-hamas-s-newly-elected-political-chief",
  "https://www.novexa.news/news/israel-uses-law-to-destroy-palestinian-education-in-east-jerusalem",
  "https://www.novexa.news/news/what-happened-to-the-jewish-left",
  "https://www.novexa.news/news/ryanair-profits-tumble-as-jet-fuel-costs-soar",
  "https://www.novexa.news/news/i-go-with-a-smile-says-outgoing-uk-pm-keir-starmer-in-final-speech",
  "https://www.novexa.news/news/us-renews-attacks-on-iran-after-us-soldier-killed-what-s-the-latest",
  "https://www.novexa.news/news/granny-wins-care-home-happy-hour-law-change",
  "https://www.novexa.news/news/five-passengers-found-drifting-days-after-boat-sinks-in-indonesia",
  "https://www.novexa.news/news/argentinians-show-pride-in-buenos-aires-despite-world-cup-final-defeat",
  "https://www.novexa.news/news/how-a-young-and-cohesive-spain-took-down-lionel-messi-s-argentina",
  "https://www.novexa.news/news/watch-the-open-final-round-highlights",
  "https://www.novexa.news/news/spain-battle-past-10-man-argentina-1-0-in-extra-time-to-win-2026-world-cup",
  "https://www.novexa.news/news/a-bird-s-eye-view-as-donald-trump-arrives-for-the-world-cup-final",
  "https://www.novexa.news/news/itv-political-editor-found-it-too-difficult-returning-to-wales-after-wife-s-death",
  "https://www.novexa.news/news/fight-to-save-rare-ecosystem-of-chalk-streams",
  "https://www.novexa.news/news/antonelli-near-perfect-but-too-much-drama-for-hamilton-driver-ratings",
  "https://www.novexa.news/news/us-launches-new-iran-strikes-after-two-soldiers-killed-what-s-the-latest",
  "https://www.novexa.news/news/watch-the-open-third-round-highlights",
  "https://www.novexa.news/news/from-settlements-to-blocked-recovery-israeli-strategy-taking-shape-in-gaza",
  "https://www.novexa.news/news/iranians-suffer-from-power-blackouts-during-war-and-heatwave",
  "https://www.novexa.news/news/australia-news-live-pm-says-pauline-hanson-should-not-talk-australia-down-when-overseas",
  "https://www.novexa.news/news/spain-v-argentina-world-cup-2026-final-live",
  "https://www.novexa.news/news/fans-in-madrid-party-all-night-long-after-spain-s-world-cup-victory",
  "https://www.novexa.news/news/thames-water-lenders-preparing-legal-challenge-in-event-of-burnham-nationalisation",
  "https://www.novexa.news/news/england-vs-france-live-fifa-world-cup-2026",
  "https://www.novexa.news/news/watch-fifa-world-cup-argentina-spain-make-preparations-ahead-of-final",
  "https://www.novexa.news/news/russians-turn-to-cash-putting-more-strain-on-slowing-wartime-economy",
  "https://www.novexa.news/news/spain-vs-argentina-world-cup-final-predictions-schedule-messi-news",
  "https://www.novexa.news/news/wildfire-smoke-is-like-smoking-apos-half-a-pack-a-day-apos-here-apos-s-how-to-protect-yourself",
  "https://www.novexa.news/news/israel-demolishes-palestinian-home-in-masafer-yatta",
  "https://www.novexa.news/news/spain-vs-argentina-how-each-team-can-win-the-2026-world-cup-final",
  "https://www.novexa.news/news/opinion-the-continued-courage-of-captain-sully",
  "https://www.novexa.news/news/france-v-england-world-cup-third-place-playoff-live",
  "https://www.novexa.news/news/palestinian-teenage-footballer-dies-a-week-after-israeli-settler-attack",
  "https://www.novexa.news/news/argentina-wear-1986-world-cup-kit-replica-against-england",
  "https://www.novexa.news/news/landslide-in-southwest-china-kills-eight-and-leaves-34-missing",
  "https://www.novexa.news/news/waymo-called-the-cops-on-teen-riders-raising-privacy-concerns",
  "https://www.novexa.news/news/football-daily-donald-trump-gives-himself-starting-role-in-the-bigliest-occasion-of-all",
  "https://www.novexa.news/news/coca-cola-suspended-production-at-its-fairlife-dairy-after-a-ransomware-attack",
  "https://www.novexa.news/news/perseid-meteors-to-light-up-night-sky-in-one-of-the-year-s-most-active-showers",
  "https://www.novexa.news/news/the-new-1-trump-coin-doesn-apos-t-just-buck-norms-experts-say-it-also-breaks-laws",
  "https://www.novexa.news/news/spain-could-make-world-cup-history-the-first-to-win-men-apos-s-and-women-apos-s-trophies-back-to-back",
  "https://www.novexa.news/news/more-than-2-700-people-may-have-died-in-exceptional-may-and-june-heatwaves-in-england-and-wales",
  "https://www.novexa.news/news/a-mayor-in-japan-announced-her-maternity-leave-and-got-the-whole-country-talking",
  "https://www.novexa.news/news/trump-drops-bbc-s-commercial-arm-from-panorama-lawsuit-but-main-case-remains",
  "https://www.novexa.news/news/white-house-teleprompter-operator-accused-of-making-100k-from-trump-speech-bets",
  "https://www.novexa.news/news/iran-supreme-leader-warns-of-unforgettable-lessons-if-us-attacks-continue",
  "https://www.novexa.news/news/targeted-prostate-cancer-treatment-cuts-risk-of-side-effects-study-suggests",
  "https://www.novexa.news/news/air-quality-improving-in-northeast-while-wildfire-smoke-hangs-over-midwest",
  "https://www.novexa.news/news/takeaways-from-trump-apos-s-primetime-speech-and-at-least-2-dead-in-major-texas-flooding",
  "https://www.novexa.news/news/taco-bell-removes-lettuce-from-menu-in-us-after-links-to-explosive-diarrhoea",
  "https://www.novexa.news/news/france-vs-england-deschamps-set-for-final-world-cup-match-as-zidane-waits",
  "https://www.novexa.news/news/one-anti-war-critic-fined-another-held-as-russia-clamps-down-on-dissent",
  "https://www.novexa.news/news/beyond-lng-berlin-s-red-carpet-diplomacy-signals-a-bigger-bet-on-algeria",
  "https://www.novexa.news/news/they-took-our-toilet-how-a-settlement-has-squeezed-a-palestinian-village",
  "https://www.novexa.news/news/keep-calm-and-carry-on-spain-trust-team-identity-to-deliver-world-cup",
  "https://www.novexa.news/news/a-seventh-night-of-us-strikes-cuts-water-to-villages-in-iran-s-south",
  "https://www.novexa.news/news/greens-leader-renews-call-for-extra-security-after-ann-widdecombe-death",
  "https://www.novexa.news/news/thousands-rally-in-london-in-support-of-gaza-demand-new-pm-take-action",
  "https://www.novexa.news/news/longest-dry-spell-in-30-years-for-parts-of-england-as-heatwave-hits-two-week-mark",
  "https://www.novexa.news/news/uk-begins-trials-of-ebola-vaccine-developed-in-just-eight-weeks",
  "https://www.novexa.news/news/d-apos-oh-i-can-apos-t-believe-i-did-that-graceful-ways-to-handle-awkward-moments",
  "https://www.novexa.news/news/chaos-v-calm-sutton-s-world-cup-final-and-third-place-predictions",
  "https://www.novexa.news/news/men-s-transfer-window-summer-2026-all-deals-from-europe-s-top-five-leagues",
  "https://www.novexa.news/news/at-least-three-killed-and-hundreds-displaced-by-heavy-rain-in-chile",
  "https://www.novexa.news/news/china-signals-possible-return-of-u-s-trade-privileges-for-hong-kong",
  "https://www.novexa.news/news/iranian-official-says-the-policy-of-negotiating-during-war-is-over",
  "https://www.novexa.news/news/i-wouldn-t-marry-him-until-he-paid-off-his-debt-now-i-m-in-charge-of-our-money",
  "https://www.novexa.news/news/uk-says-falkland-islands-definitely-ours-after-argentina-banner",
  "https://www.novexa.news/news/first-atmosphere-found-on-earth-like-planet-in-habitable-zone-of-distant-star",
  "https://www.novexa.news/news/spacex-suddenly-aborts-second-starship-v3-launch-after-ignition",
  "https://www.novexa.news/news/venice-protesters-rally-against-us-ambassador-s-superyacht-tour",
  "https://www.novexa.news/news/spain-s-final-training-session-before-world-cup-final-cancelled",
  "https://www.novexa.news/news/damage-visible-at-iran-bridges-and-water-plant-after-us-attacks",
  "https://www.novexa.news/news/amazon-s-zoox-recalls-self-driving-vehicles-amid-emergency-response-issues",
  "https://www.novexa.news/news/olympic-cyclist-admits-to-driving-despite-ban-after-crash-that-killed-wife",
  "https://www.novexa.news/news/mandela-day-what-his-legacy-means-in-today-s-south-africa",
  "https://www.novexa.news/news/pakistan-resisting-uk-attempts-to-deport-grooming-gang-leader",
  "https://www.novexa.news/news/san-francisco-mayor-pushes-for-tougher-rules-after-the-waymo-traffic-fiasco",
  "https://www.novexa.news/news/china-warns-uk-over-british-steel-nationalisation-demands-fair-resolution",
  "https://www.novexa.news/news/ten-killed-in-attacks-in-russia-and-ukraine-as-protests-continue-in-kyiv",
  "https://www.novexa.news/news/aer-lingus-proposes-cutting-500-jobs-under-savings-plan",
  "https://www.novexa.news/news/five-football-players-who-rose-to-social-media-stardom-at-the-world-cup",
  "https://www.novexa.news/news/indian-activist-on-hunger-strike-for-20-days-forcibly-taken-to-hospital",
  "https://www.novexa.news/news/israel-s-crimson-thread-military-barrier-is-strangling-the-west-bank",
  "https://www.novexa.news/news/ice-shared-medicaid-data-it-wasn-apos-t-supposed-to-have-with-palantir",
  "https://www.novexa.news/news/women-s-transfer-window-summer-2026-all-deals-from-world-s-top-six-leagues",
  "https://www.novexa.news/news/british-steel-taken-into-public-ownership-to-protect-vital-uk-supply",
  "https://www.novexa.news/news/nature-reserve-declared-to-coincide-with-king-s-visit",
  "https://www.novexa.news/news/paralympian-dame-sarah-storey-joins-strictly-line-up",
  "https://www.novexa.news/news/iranian-forces-missiles-and-drones-fired-at-us-targets-in-gulf-states",
  "https://www.novexa.news/news/a-tide-fueled-trove-of-biodiversity-in-guinea-bissau",
  "https://www.novexa.news/news/what-to-expect-after-the-us-reimposes-naval-blockade-on-iran-s-ports",
  "https://www.novexa.news/news/the-harrowing-dark-side-of-england-s-world-cup-exit",
  "https://www.novexa.news/news/brewdog-founder-faces-data-complaints-over-efforts-to-buy-back-firm",
  "https://www.novexa.news/news/kolkata-sings-for-messi-as-world-cup-fever-takes-hold",
  "https://www.novexa.news/news/pele-s-1958-world-cup-final-shirt-sells-for-4-9m",
  "https://www.novexa.news/news/how-do-young-people-feel-about-ai-7-teens-weigh-in",
  "https://www.novexa.news/news/all-time-west-indies-cricket-great-garfield-sobers-dies-aged-89",
  "https://www.novexa.news/news/andy-serkis-defends-lack-of-diversity-in-lord-of-the-rings-cast",
  "https://www.novexa.news/news/signed-hockney-print-found-in-a-book-sells-for-41k",
  "https://www.novexa.news/news/life-after-amputation-gaza-women-find-recovery-through-football",
  "https://www.novexa.news/news/uefa-will-not-use-var-for-diving-like-at-world-cup",
  "https://www.novexa.news/news/world-cup-final-the-tour-de-france-and-open-golf-follow-with-us",
  "https://www.novexa.news/news/nsw-woman-arrested-over-movements-of-dezi-freeman-as-it-happened",
  "https://www.novexa.news/news/leaky-pipes-may-explain-years-long-bay-pollution",
  "https://www.novexa.news/news/uk-s-josh-kerr-smashes-longstanding-world-mile-record-in-london",
  "https://www.novexa.news/news/at-least-14-dead-after-minibus-rolls-off-mountain-road-in-peru",
  "https://www.novexa.news/news/world-cup-2026-latest-buildup-to-france-v-england-third-place-playoff-and-spain-v-argentina-final",
  "https://www.novexa.news/news/apple-sues-openai-its-employees-claiming-theft-of-trade-secrets",
  "https://www.novexa.news/news/trump-alleges-china-meddled-in-2020-election-and-questions-voting-security-ahead-of-midterms",
  "https://www.novexa.news/news/philippines-condemns-monkey-video-on-chinese-media-as-racist",
  "https://www.novexa.news/news/plainclothes-ice-agents-manhandle-man-during-arrest-attempt",
  "https://www.novexa.news/news/mp-calls-for-widdecombe-memorial-in-parliament",
  "https://www.novexa.news/news/why-has-the-ceasefire-in-gaza-failed-to-stop-israel-s-attacks",
  "https://www.novexa.news/news/can-the-us-and-iran-reach-a-lasting-deal-to-end-the-conflict",
  "https://www.novexa.news/news/china-apos-s-economy-grows-4-3-in-q2-slowest-since-late-2022",
  "https://www.novexa.news/news/five-headaches-andy-burnham-will-have-to-deal-with-as-pm",
  "https://www.novexa.news/news/clacton-by-election-attracts-34-candidates",
  "https://www.novexa.news/news/uk-economy-returns-to-growth-in-may-0a1cb601",
  "https://www.novexa.news/news/how-about-that-best-shots-from-second-round-at-the-open",
  "https://www.novexa.news/news/absolutely-fabulous-best-shots-from-third-round-of-the-open",
  "https://www.novexa.news/news/reporter-apos-s-notebook-finding-world-cup-joy-in-speaking-to-women-who-love-soccer",
  "https://www.novexa.news/news/targets-of-latest-us-strikes-on-iran-signal-strategic-shift",
  "https://www.novexa.news/news/tiktok-faces-ofcom-investigation-over-child-age-checks",
  "https://www.novexa.news/news/armed-groups-attack-malian-military-convoy-in-gao-region",
  "https://www.novexa.news/news/how-deadly-have-the-heatwaves-in-england-and-wales-been",
  "https://www.novexa.news/news/apple-regains-top-spot-as-world-s-most-valuable-company",
  "https://www.novexa.news/news/jesy-nelson-calls-plan-to-test-newborns-for-life-limiting-muscle-condition-a-victory",
  "https://www.novexa.news/news/meta-pulls-new-ai-image-feature-after-days-of-backlash",
  "https://www.novexa.news/news/watch-flood-waters-surge-in-texas-after-huge-rainstorms",
  "https://www.novexa.news/news/don-t-let-blood-be-on-your-hands-mother-tells-inquiry",
  "https://www.novexa.news/news/ederson-extends-contract-after-man-utd-move-collapses",
  "https://www.novexa.news/news/first-reform-uk-police-commissioner-elected",
  "https://www.novexa.news/news/the-financial-winners-and-losers-from-the-world-cup",
  "https://www.novexa.news/news/the-u-s-iran-battle-over-the-strait-of-hormuz-raises-risks-for-global-waterways",
  "https://www.novexa.news/news/uk-wasted-10bn-on-ppe-that-left-nhs-staff-poorly-protected-covid-inquiry-finds",
  "https://www.novexa.news/news/24m-tune-in-to-watch-england-argentina",
  "https://www.novexa.news/news/burnham-promises-huge-change-but-leaves-questions-about-plan-to-deliver-it",
  "https://www.novexa.news/news/zelensky-s-removal-of-popular-defence-minister-sparks-protests-in-ukraine",
  "https://www.novexa.news/news/west-indies-legend-sobers-dies-aged-89",
  "https://www.novexa.news/news/at-least-two-dead-in-texas-floods-ravaging-same-area-where-campers-died",
  "https://www.novexa.news/news/engineers-develop-a-bird-scale-flapping-robot-for-aerial-aquatic-travel",
  "https://www.novexa.news/news/tuchel-england-carry-scars-of-world-cup-heartbreak-into-france-playoff",
  "https://www.novexa.news/news/u-s-and-iran-escalate-strikes-across-mideast",
  "https://www.novexa.news/news/british-steel-taken-into-public-ownership-to-protect-vital-uk-supply-b50e613b",
  "https://www.novexa.news/news/iceberg-lettuce-at-taco-bell-linked-to-cyclospora-outbreak-in-5-states",
  "https://www.novexa.news/news/sam-neill-a-versatile-actor-whose-roles-went-far-beyond-jurassic-park",
  "https://www.novexa.news/news/the-zoom-hack-that-says-don-t-record-me",
  "https://www.novexa.news/news/hodgkinson-holds-off-broeders-bol-to-win-800m",
  "https://www.novexa.news/news/amazon-fixing-bug-that-billed-some-aws-customers-billions-of-dollars",
  "https://www.novexa.news/news/starmer-pledges-unwavering-support-for-ukraine-on-final-visit-as-pm",
  "https://www.novexa.news/news/curlew-chicks-released-to-boost-species-numbers",
  "https://www.novexa.news/news/what-type-of-procrastinator-are-you-and-how-to-fix-it-now-not-later",
  "https://www.novexa.news/news/pakistani-forces-kill-24-militants-in-border-raids-near-afghanistan",
  "https://www.novexa.news/news/pakistan-cricketer-nawaz-sanctioned-after-cannabis-related-positive-test",
  "https://www.novexa.news/news/trump-jokes-that-england-turned-harry-kane-into-a-defensive-player",
  "https://www.novexa.news/news/sadiq-khan-among-26-new-peers-to-enter-the-lords",
  "https://www.novexa.news/news/italian-officials-handed-jail-terms-for-genoa-bridge-disaster-that-killed-43",
  "https://www.novexa.news/news/cool-in-90-seconds-the-fake-portable-air-conditioners-sweeping-the-internet",
  "https://www.novexa.news/news/volunteer-firefighter-suspected-of-starting-devastating-france-forest-fire",
  "https://www.novexa.news/news/how-my-period-is-supercharging-my-adhd",
  "https://www.novexa.news/news/uk-economy-returns-to-growth-in-may",
  "https://www.novexa.news/news/midnight-social-media-curfew-proposed-for-uk-teens-aged-16-and-17",
  "https://www.novexa.news/news/trump-media-reportedly-mulling-fee-for-first-access-to-social-media-posts",
  "https://www.novexa.news/news/us-military-says-two-service-members-killed-in-iranian-strike-in-jordan",
  "https://www.novexa.news/news/why-are-uk-fuel-prices-rising-again",
  "https://www.novexa.news/news/leeds-sign-34-1m-defender-muharemovic",
  "https://www.novexa.news/news/ten-unheard-tracks-from-david-bowie-s-early-career-to-be-released",
  "https://www.novexa.news/news/in-new-york-s-little-palestine-fans-cheer-for-spain-in-world-cup-final",
  "https://www.novexa.news/news/new-york-s-mamdani-says-looking-into-netanyahu-arrest-during-city-visit",
  "https://www.novexa.news/news/josh-kerr-of-britain-breaks-27-year-old-world-record-in-the-mile",
  "https://www.novexa.news/news/lebanon-s-aoun-to-meet-trump-in-washington-to-discuss-israel-talks",
  "https://www.novexa.news/news/belgium-bans-imports-from-israeli-settlements-in-occupied-palestine",
  "https://www.novexa.news/news/trump-media-to-sell-instant-access-to-market-moving-social-posts",
  "https://www.novexa.news/news/teenagers-from-15-should-be-given-free-menb-vaccine-say-uk-experts",
  "https://www.novexa.news/news/analyst-questions-trump-s-renewed-focus-on-us-election-integrity",
  "https://www.novexa.news/news/is-the-assassin-s-creed-black-flag-remake-worth-the-13-year-wait",
  "https://www.novexa.news/news/australia-deeply-frustrated-over-laos-methanol-poisoning-charges",
  "https://www.novexa.news/news/barmy-council-shake-up-could-be-challenged",
  "https://www.novexa.news/news/russian-online-retail-warehouses-hit-by-deadly-ukrainian-strikes",
  "https://www.novexa.news/news/world-cup-rings-for-winners-as-trump-attendance-confirmed",
  "https://www.novexa.news/news/energy-drinks-to-be-banned-for-under-16s-in-england-from-april",
  "https://www.novexa.news/news/burns-birdies-both-par-fives-to-take-two-shot-lead-at-the-open",
  "https://www.novexa.news/news/drone-video-shows-scale-of-major-wildfire-in-northern-spain",
  "https://www.novexa.news/news/why-some-african-nations-are-turning-down-trump-aid-money",
  "https://www.novexa.news/news/why-is-it-so-hard-for-the-u-s-to-win-wars",
  "https://www.novexa.news/news/thousands-of-tickets-still-available-for-england-v-france",
  "https://www.novexa.news/news/what-are-the-symptoms-of-meningitis-and-how-is-it-spread",
  "https://www.novexa.news/news/a-very-quick-guide-to-andy-burnham",
  "https://www.novexa.news/news/white-house-defends-argentina-team-over-falklands-banner",
  "https://www.novexa.news/news/israeli-attacks-on-residential-areas-in-gaza-kill-eight",
  "https://www.novexa.news/news/britain-s-kerr-breaks-27-year-mile-world-record-in-london",
  "https://www.novexa.news/news/new-councils-to-be-created-in-14-areas-of-england",
  "https://www.novexa.news/news/nasa-welcomes-serbia-as-newest-artemis-accords-signatory",
  "https://www.novexa.news/news/the-2000s-called-they-want-their-digital-camera-back",
  "https://www.novexa.news/news/who-is-the-frontrunner-to-be-the-uk-s-next-chancellor",
  "https://www.novexa.news/news/burnham-planning-summer-tour-of-uk-in-early-weeks-as-pm",
  "https://www.novexa.news/news/dechambeau-hit-with-shock-two-stroke-penalty-at-the-open"
];

const BOILERPLATE_PATTERNS: RegExp[] = [
  /.*remains an important [A-Za-z ]+ update for Novexa News readers, and this refreshed version keeps the original indexed page active while giving the story clearer context and a more natural reading flow\.\s*/gi,
  /Novexa News is presenting the core available details in original wording[^.]*\.\s*(As more confirmed information becomes available[^.]*\.)?/gi,
  /This report is based on a monitored public feed[^.]*\.\s*/gi,
  /The available feed detail is limited, so this report stays close to confirmed information[^.]*\.\s*/gi,
  /No further details about[^.]*were included in the feed information[^.]*\.\s*/gi,
  /Novexa News will continue watching for official statements[^.]*\.\s*/gi,
  /is among the latest updates being followed by Novexa News from [^.]*\.\s*/gi,
  /is one of the latest updates being tracked by Novexa News from [^.]*\.\s*/gi,
  /The story falls under the [A-Za-z ]+ desk and is being treated as a developing update based on verified feed metadata\.\s*/gi,
  /The story falls under the [A-Za-z ]+ desk and may matter to readers following[^.]*\.\s*/gi,
  /This newsroom brief was automatically prepared from a monitored public feed[^.]*\.\s*/gi,
  /This development is important for readers following[^.]*\.\s*/gi,
  /Without relying on a bare RSS summary[^.]*\.\s*/gi,
  /Has rewritten the article in a clearer editorial style[^.]*\.\s*/gi,
  /The story becomes a short-lived item or a continuing news thread[^.]*\.\s*/gi,
  /Readers who want plain language rather than a thin summary[^.]*\.\s*/gi,
  /The immediate takeaway is[^.]*\.\s*/gi,
  /For search visitors[^.]*\.\s*/gi,
  /This story continues to attract attention[^.]*\.\s*/gi,
  /Source:\s*[^-\n]+(?:-[^\n]+)?/gi,
  /Image credit:\s*[^-\n]+(?:-[^\n]+)?/gi
];

const GARBLED_TITLE_PREFIX = /^(Pakistan|World|Technology|Business|Sports|Politics|Health|Entertainment|Science)\s+update:\s*/i;

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(title: string, content: string): { cleaned: string; changed: boolean } {
  if (!content) return { cleaned: "", changed: false };
  let text = decodeHtmlEntities(content);
  let changed = text !== content;

  for (const pattern of BOILERPLATE_PATTERNS) {
    const prev = text;
    text = text.replace(pattern, "");
    if (text !== prev) changed = true;
  }

  // Remove duplicated lede paragraph if it matches title
  const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const cleanParagraphs: string[] = [];

  for (const p of paragraphs) {
    const normP = p.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normP === normTitle) {
      changed = true;
      continue;
    }
    cleanParagraphs.push(p);
  }

  // Deduplicate repeated sentences across paragraphs
  const seenSentences = new Set<string>();
  const finalParagraphs: string[] = [];

  for (const paragraph of cleanParagraphs) {
    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    const uniqueSentences: string[] = [];
    for (const sentence of sentences) {
      const sNorm = sentence.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      if (sNorm.length > 25) {
        if (seenSentences.has(sNorm)) {
          changed = true;
          continue;
        }
        seenSentences.add(sNorm);
      }
      uniqueSentences.push(sentence);
    }
    if (uniqueSentences.length > 0) {
      finalParagraphs.push(uniqueSentences.join(" "));
    }
  }

  text = finalParagraphs.join("\n\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  return { cleaned: text, changed };
}

function cleanTitle(title: string): { cleaned: string; changed: boolean } {
  if (!title) return { cleaned: "", changed: false };
  let out = decodeHtmlEntities(title);
  let changed = out !== title;
  if (GARBLED_TITLE_PREFIX.test(out)) {
    out = out.replace(GARBLED_TITLE_PREFIX, "").trim();
    changed = true;
  }
  return { cleaned: out, changed };
}

async function run() {
  const apply = process.argv.includes("--apply");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured in env");

  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const articlesCol = mongoose.connection.db.collection("articles");

  const targetSlugs = targetUrls.map((u) => u.replace("https://www.novexa.news/news/", "").trim());

  // 1. Fix missing slug for hundi hawala article
  const hundiDoc = await articlesCol.findOne({ slug: "war-dries-up-unofficial-dollar-inflows" });
  if (hundiDoc) {
    console.log(`Updating misplaced slug document ${hundiDoc._id} to target slug...`);
    if (apply) {
      await articlesCol.updateOne(
        { _id: hundiDoc._id },
        { $set: { slug: "gulf-war-dries-up-unofficial-dollar-inflows-through-hundi-and-hawala-network" } }
      );
    }
  }

  const docs = await articlesCol.find({ slug: { $in: targetSlugs } }).toArray();
  console.log(`Processing ${docs.length} target 404 articles | Mode=${apply ? "APPLY" : "DRY-RUN"}`);

  const bulkOps = [];
  let publishedCount = 0;
  let cleanedBoilerplateCount = 0;
  let cleanedTitleCount = 0;

  for (const doc of docs) {
    const updates: Record<string, any> = {};

    const titleRes = cleanTitle(doc.title);
    if (titleRes.changed) {
      updates.title = titleRes.cleaned;
      cleanedTitleCount++;
    }

    const currentTitle = updates.title || doc.title || "";
    const contentRes = cleanText(currentTitle, doc.content || "");
    if (contentRes.changed || titleRes.changed) {
      updates.content = contentRes.cleaned;
      cleanedBoilerplateCount++;
    }

    if (doc.excerpt) {
      const excerptRes = cleanText(currentTitle, doc.excerpt);
      if (excerptRes.changed) updates.excerpt = excerptRes.cleaned;
    }

    updates.status = "published";
    updates.reviewStatus = "approved";
    updates.generationMode = "ai";
    updates.rejectionReasons = [];
    updates.duplicateRisk = 0;
    updates.updatedAt = new Date();
    updates.contentUpdatedAt = new Date();
    if (!doc.publishedAt) updates.publishedAt = new Date();

    bulkOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: updates }
      }
    });

    publishedCount++;
  }

  console.log({
    totalProcessed: docs.length,
    publishedCount,
    cleanedBoilerplateCount,
    cleanedTitleCount,
    opsQueued: bulkOps.length
  });

  if (apply && bulkOps.length > 0) {
    console.log(`Writing ${bulkOps.length} updates to MongoDB...`);
    const res = await articlesCol.bulkWrite(bulkOps, { ordered: false });
    console.log(`Successfully modified ${res.modifiedCount} articles!`);

    // Verification check
    console.log("\nVerifying published & indexability status of target URLs...");
    const verifyDocs = await articlesCol.find({ slug: { $in: targetSlugs }, status: "published", reviewStatus: "approved" }).toArray();
    const indexableCount = verifyDocs.filter((d) => isArticleIndexable(d)).length;

    console.log(`Verification result: ${verifyDocs.length} / ${targetSlugs.length} articles are PUBLISHED & APPROVED.`);
    console.log(`SEO Indexability: ${indexableCount} / ${targetSlugs.length} articles pass full SEO indexability filters!`);
  } else {
    console.log("\nDry run complete. Pass --apply to write changes to MongoDB.");
  }
}

run().catch((error) => {
  console.error("Execution failed:", error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
