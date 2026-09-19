import "dotenv/config";
import mongoose from "mongoose";
import { isArticleIndexable, articleIndexabilityIssues } from "../src/lib/public-articles";

const userPastedCsv = `URL,Last crawled
https://www.novexa.news/,2026-08-19
https://www.novexa.news/news/the-two-days-which-could-make-or-break-fury-aj,2026-08-01
https://www.novexa.news/news/bp-puts-its-north-sea-drilling-business-up-for-sale,2026-08-01
https://www.novexa.news/news/infantino-under-huge-pressure-after-plan-for-world-cup-sell-off-sparks-resignation-and,2026-08-01
https://www.novexa.news/news/nasa-assigns-astronaut-deniz-burnham-to-first-space-station-mission,2026-08-01
https://www.novexa.news/news/govt-cuts-petrol-price-by-12-paisas-diesel-by-66-paisas-for-the-next-three-days,2026-08-01
https://www.novexa.news/news/russia-and-ukraine-report-casualties-as-they-continue-to-trade-attacks,2026-08-01
https://www.novexa.news/news/iran-war-live-updates-u-s-and-saudi-arabia-target-iranian-proxies,2026-08-01
https://www.novexa.news/news/iran-war-drives-oil-profits-to-highest-levels-in-years,2026-08-01
https://www.novexa.news/news/nato-jets-scramble-as-russian-missile-detonates-in-poland,2026-07-31
https://www.novexa.news/news/abc-formally-rebukes-f-c-c-for-review-of-tv-licenses,2026-07-31
https://www.novexa.news/news/france-becomes-first-eu-country-to-officially-ban-social-media-for-children,2026-07-31
https://www.novexa.news/news/senate-output-increased-in-2025-26-scrutiny-weakened-pildat,2026-07-31
https://www.novexa.news/news/lhc-grants-imran-s-sister-noreen-niazi-protective-bail-in-peca-case,2026-07-31
https://www.novexa.news/news/spain-deploys-military-to-ceuta-after-thousands-of-people-breach-morocco-s-border,2026-07-31
https://www.novexa.news/news/could-ai-take-your-job-some-workers-in-china-already-know-the-answer,2026-07-31
https://www.novexa.news/news/karachi-s-dha-city-becomes-first-private-entity-to-light-up-its-own-housing-project,2026-07-31
https://www.novexa.news/news/viral-finger-clicker-suspended-as-cricket-storm-remains-in-global-spotlight,2026-07-31
https://www.novexa.news/news/investigation-into-parking-tickets-for-drivers-queuing-at-petrol-stations,2026-07-31
https://www.novexa.news/news/saudi-arabia-confirmed-to-host-asian-champions-league-elite-finals,2026-07-31
https://www.novexa.news/news/tesla-made-its-10-millionth-ev,2026-07-31
https://www.novexa.news/news/anthropic-says-ai-models-hacked-three-firms-during-tests,2026-07-31
https://www.novexa.news/news/europe-s-heating-climate-sparks-major-intensification-of-fires-report,2026-07-31
https://www.novexa.news/news/senate-panel-delays-vote-on-blanche-s-nomination-as-key-republicans-withhold-support,2026-07-31
https://www.novexa.news/news/zoox-clears-final-federal-hurdle-to-launch-paid-robotaxi-service,2026-07-31
https://www.novexa.news/news/israeli-strikes-leave-buildings-burning-in-gaza-city,2026-07-31
https://www.novexa.news/news/milestone-moment-for-o-connor-with-glasgow-gold,2026-07-31
https://www.novexa.news/news/emmanuel-eseme-zoe-hobbs-shine-in-glasgow-rain-to-win-commonwealth-games-gold,2026-07-31
https://www.novexa.news/news/apple-sued-after-alleged-app-store-crypto-scam-cost-users-1-8m,2026-07-31
https://www.novexa.news/news/american-ai-is-expensive-some-startups-are-turning-to-cheap-chinese-models,2026-07-31
https://www.novexa.news/news/starting-uni-what-to-know-about-the-free-nhs-meningitis-b-jab-in-england,2026-07-31
https://www.novexa.news/news/nhs-manager-says-trust-wanted-4-000-reports-gone,2026-07-31
https://www.novexa.news/news/peace-stability-only-possible-by-eliminating-terrorism-emanating-from-afghanistan-dar,2026-07-31
https://www.novexa.news/news/heavy-monsoon-rain-floods-lahore-roads-slows-traffic-across-city,2026-07-31
https://www.novexa.news/news/firing-of-ukraine-s-top-general-signals-the-end-of-an-era,2026-07-31
https://www.novexa.news/news/how-ai-guardrails-are-impeding-the-work-of-offensive-cybersecurity-researchers,2026-07-31
https://www.novexa.news/news/change-is-inevitable-liverpool-ceo-on-fsg-iraola-and-consortium-talks,2026-07-31
https://www.novexa.news/news/anthropic-adds-a-more-capable-claude-voice-mode-for-everyday-tasks,2026-07-31
https://www.novexa.news/news/israeli-strikes-kill-at-least-four-including-children-across-gaza-strip,2026-07-31
https://www.novexa.news/news/us-strikes-cause-extensive-damage-on-iran-s-qeshm-island,2026-07-31
https://www.novexa.news/news/salman-rushdie-attacker-convicted-of-terror-offenses,2026-07-31
https://www.novexa.news/news/government-borrowing-cost-hits-two-decade-high-after-fed-rate-decision,2026-07-31
https://www.novexa.news/news/officials-probe-whether-white-house-teleprompter-operator-profited-off-trump-apos-s-words,2026-07-31
https://www.novexa.news/news/8-killed-and-more-than-60-wounded-in-ukrainian-drone-attack-on-russian-regions,2026-07-31
https://www.novexa.news/news/canadian-wildfire-smoke-shrouds-us-potential-risk-for-world-cup-final,2026-07-31
https://www.novexa.news/news/peter-falconio-murder-british-expert-says-he-has-identified-a-most-likely-burial-location,2026-07-31
https://www.novexa.news/news/juli-n-lvarez-s-extra-time-stunner-sinks-10-man-switzerland-to-send-argentina-into-semi-finals,2026-07-31
https://www.novexa.news/news/messi-returns-to-mls-training-10-days-after-world-cup-final-heartbreak,2026-07-31
https://www.novexa.news/news/infantino-insists-fifa-s-world-cup-plan-is-proposal-and-not-obligation,2026-07-31
https://www.novexa.news/news/the-trump-administration-s-move-to-end-subsidies-for-medicare-drug-plans-could-cost,2026-07-31
https://www.novexa.news/news/questions-grow-over-ice-vetting-after-fatal-shootings-and-rapid-hiring,2026-07-31
https://www.novexa.news/news/holidaymakers-warned-about-explosive-diarrhoea-cyclospora-parasite-infection,2026-07-31
https://www.novexa.news/news/how-climate-change-and-tariffs-help-china-raise-more-cattle,2026-07-31
https://www.novexa.news/news/air-india-offered-to-cover-my-flight-on-another-airline-it-cost-me-2-000,2026-07-31
https://www.novexa.news/news/businessman-s-meeting-with-netanyahu-stirs-uproar-in-lebanon,2026-07-31
https://www.novexa.news/news/is-fifa-selling-parts-of-the-world-cup-to-private-investors,2026-07-31
https://www.novexa.news/news/roads-in-baltistan-astore-reopen-after-a-week,2026-07-31
https://www.novexa.news/news/bilawal-warns-countdown-will-begin-for-federal-government-if-it-steals-ajk-election,2026-07-31
https://www.novexa.news/news/germany-s-merz-hails-nuclear-deterrence-cooperation-with-france,2026-07-31
https://www.novexa.news/news/some-parents-on-benefits-to-get-up-to-4-500-for-child-starting-apprenticeship,2026-07-31
https://www.novexa.news/news/taco-bell-sales-recover-following-cyclospora-outbreak,2026-07-31
https://www.novexa.news/news/israeli-raids-and-settler-attacks-intensify-across-the-occupied-west-bank,2026-07-31
https://www.novexa.news/news/west-indies-beat-pakistan-by-90-runs-in-first-test,2026-07-30
https://www.novexa.news/news/us-launches-powerful-strikes-on-iran-after-jordan-attack,2026-07-30
https://www.novexa.news/news/jermain-defoe-leaves-woking-after-brief-first-spell-in-management,2026-07-30
https://www.novexa.news/news/trump-considering-ai-controls-after-openai-hacking-incidents,2026-07-30
https://www.novexa.news/news/four-pointers-to-most-open-premier-league-title-race-in-years,2026-07-30
https://www.novexa.news/news/pope-leo-says-he-hopes-to-visit-u-s-within-next-couple-of-years,2026-07-30
https://www.novexa.news/news/japan-in-a-race-against-time-to-rescue-people-trapped-beneath-rubble-after-quake,2026-07-30
https://www.novexa.news/news/why-is-uganda-experiencing-a-food-crisis,2026-07-30
https://www.novexa.news/news/five-things-we-ve-learned-from-first-half-of-f1-season,2026-07-30
https://www.novexa.news/news/every-day-i-m-just-winging-it-the-families-hoping-for-social-care-reform,2026-07-30
https://www.novexa.news/news/between-hope-and-fear-yemenis-react-to-houthi-blockade-on-saudi-arabia,2026-07-30
https://www.novexa.news/news/evo-morales-defiant-after-new-bolivia-arrest-warrant,2026-07-30
https://www.novexa.news/news/pml-n-s-gift-of-e-buses-arrives-in-muzaffarabad-as-ajk-election-commission-warns,2026-07-30
https://www.novexa.news/news/judge-allows-use-of-police-interview-in-tupac-shakur-murder-trial,2026-07-30
https://www.novexa.news/news/managed-exchange-rate-hurts-trade-and-foreign-investments-say-exporters,2026-07-30
https://www.novexa.news/news/pakistan-s-population-can-reach-400-million-by-2040,2026-07-30
https://www.novexa.news/news/liberty-embraces-sewing-boom-with-craft-classes-as-it-expands-fabrics-section,2026-07-30
https://www.novexa.news/news/paypal-leaves-the-door-open-to-a-higher-takeover-offer-following-earnings-beat,2026-07-30
https://www.novexa.news/news/water-supply-issue-affects-gatwick-airport,2026-07-30
https://www.novexa.news/news/andy-burnham-rules-out-early-election-in-exclusive-bbc-interview,2026-07-30
https://www.novexa.news/news/pml-n-grabs-9-out-of-13-seats-across-ajk-s-mirpur-division-unofficial-results-show,2026-07-30
https://www.novexa.news/news/uefa-says-fifa-plan-for-private-investment-in-world-cup-crosses-line,2026-07-30
https://www.novexa.news/news/us-saudi-forces-strike-iran-aligned-terrorists-in-iraq-in-retaliation-for-recent,2026-07-30
https://www.novexa.news/news/zendaya-on-working-with-tom-holland-in-spider-man-when-you-re-best-friends-it-s-easy,2026-07-30
https://www.novexa.news/news/israeli-settler-attack-on-at-tuwani,2026-07-30
https://www.novexa.news/news/uncertainty-in-gulf-likely-to-keep-policy-rate-unchanged,2026-07-30
https://www.novexa.news/news/pakistan-spends-record-3-8bn-on-palm-oil-imports,2026-07-30
https://www.novexa.news/news/the-chips-rout-goes-global,2026-07-30
https://www.novexa.news/news/a-son-of-wealth-finds-his-calling-in-a-high-end-grocery-store,2026-07-30
https://www.novexa.news/news/ahsan-iqbal-calls-for-fast-track-transition-to-electric-vehicles,2026-07-30
https://www.novexa.news/news/local-match-goes-viral-over-finger-clicking-cheating-claim,2026-07-30
https://www.novexa.news/news/lib-dem-mp-calls-for-investigation-into-reform-deputy-leader-s-80-000-loan,2026-07-30
https://www.novexa.news/news/peru-fire-leaves-10-family-members-dead-as-investigators-probe-cause,2026-07-30
https://www.novexa.news/news/peshawar-university-teacher-honoured-with-ashoka-award-in-london,2026-07-30
https://www.novexa.news/news/pop-star-madison-beer-and-nfl-player-justin-herbert-announce-engagement,2026-07-30
https://www.novexa.news/news/japanese-football-legend-king-kazu-59-scores-first-goal-in-four-years,2026-07-29
https://www.novexa.news/news/train-drivers-in-great-britain-consider-strike-action-over-lack-of-toilets,2026-07-29
https://www.novexa.news/news/photos-wildfires-in-france-drive-250-000-people-from-their-homes,2026-07-29
https://www.novexa.news/news/burnham-doesn-t-rule-out-tax-rises-to-fix-social-care,2026-07-29
https://www.novexa.news/news/peppa-pig-owners-win-copyright-battle-against-impostor-wolfoo,2026-07-29
https://www.novexa.news/news/ajk-elections-pml-n-grabs-9-out-of-13-seats-across-mirpur-division-unofficial-results,2026-07-29
https://www.novexa.news/news/how-premier-league-futures-programme-is-helping-former-academy-prospects,2026-07-29
https://www.novexa.news/news/war-on-iran-phase-ii-day-17,2026-07-29
https://www.novexa.news/news/trump-on-erdogan-netanyahu-and-selling-fighter-jets-to-turkiye,2026-07-29
https://www.novexa.news/news/why-chelsea-want-to-sign-older-players,2026-07-29
https://www.novexa.news/news/how-india-s-cockroach-protesters-shook-the-modi-government,2026-07-29
https://www.novexa.news/news/oman-pitches-gulf-backed-hormuz-plan-to-iran,2026-07-29
https://www.novexa.news/news/trump-administration-admits-canceling-clean-energy-grants-to-democratic-states,2026-07-29
https://www.novexa.news/news/mcp-startup-runlayer-accuses-rippling-of-stealing-its-product-idea,2026-07-29
https://www.novexa.news/news/one-dead-several-injured-after-vehicle-plows-through-crowd-at-lgbtq-event-in-germany,2026-07-29
https://www.novexa.news/news/russia-charges-telegram-founder-pavel-durov-with-aiding-terrorism,2026-07-29
https://www.novexa.news/news/elon-musk-s-firm-eyes-20-billion-valuation,2026-07-29
https://www.novexa.news/news/why-has-iran-s-economy-not-collapsed-under-us-war-pressure,2026-07-29
https://www.novexa.news/news/sick-of-a-i-generated-content-the-slop-janitor-is-here-to-help,2026-07-29
https://www.novexa.news/news/pregnant-palestinian-woman-loses-baby-after-israeli-checkpoint-stop,2026-07-29
https://www.novexa.news/news/gulf-war-dries-up-unofficial-dollar-inflows-through-hundi-and-hawala-network,2026-07-29
https://www.novexa.news/news/a-i-companies-are-recruiting-electricians-and-carpenters-by-the-thousands,2026-07-29
https://www.novexa.news/news/thousands-in-spain-return-home-but-new-heatwave-raises-wildfire-fears,2026-07-29
https://www.novexa.news/news/how-has-the-indian-government-responded-to-cockroach-protests,2026-07-29
https://www.novexa.news/news/lando-norris-wins-hungarian-grand-prix-for-first-f1-triumph-in-2026,2026-07-29
https://www.novexa.news/news/smoke-blankets-oregon,2026-07-29
https://www.novexa.news/news/seven-killed-20-hurt-as-heavy-rains-lash-punjab,2026-07-29
https://www.novexa.news/news/new-north-sea-oil-drilling-faces-delay-after-gear-accidentally-dropped-in-sea,2026-07-29
https://www.novexa.news/news/global-oil-prices-jump-as-attacks-resume-in-the-middle-east,2026-07-29
https://www.novexa.news/news/israeli-forces-target-gaza-s-al-aqsa-hospital,2026-07-29
https://www.novexa.news/news/burnham-invites-tories-and-lib-dems-to-social-care-talks,2026-07-29
https://www.novexa.news/news/authors-wary-of-content-ownership-despite-court-ruling-on-anthropic-case,2026-07-29
https://www.novexa.news/news/over-600-us-troops-wounded-since-iran-war-began,2026-07-29
https://www.novexa.news/news/uk-faces-very-difficult-trade-offs-in-budget-because-of-iran-war-say-analysts,2026-07-29
https://www.novexa.news/news/saudi-arabia-defends-against-drone-strikes-from-iran-backed-groups,2026-07-29
https://www.novexa.news/news/yemen-s-houthis-claim-missile-attack-on-saudi-arabia-oil-tanker,2026-07-29
https://www.novexa.news/news/how-us-defence-aid-shaped-israel-s-military-developments-since-oct-7-2023,2026-07-29
https://www.novexa.news/news/apple-launches-upgrade-device-leasing-program-in-partnership-with-klarna,2026-07-29
https://www.novexa.news/news/trump-i-m-running-for-a-fourth-term-as-president-of-the-united-states,2026-07-29
https://www.novexa.news/news/ebola-response-workers-strike-in-dr-congo-as-death-toll-spikes,2026-07-29
https://www.novexa.news/news/rome-s-viral-graffiti-cleaner-is-taking-on-an-ancient-problem,2026-07-29
https://www.novexa.news/news/floodwaters-sever-rail-link-between-lahore-faisalabad,2026-07-29
https://www.novexa.news/news/trump-says-iran-war-talks-taking-place-during-lull-in-strikes,2026-07-29
https://www.novexa.news/news/president-pm-others-return-gifts-to-toshakhana,2026-07-29
https://www.novexa.news/news/nothing-makes-sense-ramsay-peaty-beaten-again,2026-07-29
https://www.novexa.news/news/pti-slams-govt-over-rs1-8bn-package-for-bureaucrats,2026-07-29
https://www.novexa.news/news/a-japanese-town-wrestles-with-identity-after-protests-over-its-first-mosque,2026-07-29
https://www.novexa.news/news/gates-smashed-and-crops-destroyed-as-farmers-threatened-by-gangs-hunting-hares,2026-07-29
https://www.novexa.news/news/nasa-astronaut-chris-williams-returns-to-earth,2026-07-29
https://www.novexa.news/news/moment-canadian-politician-accidentally-reads-ai-prompt-during-speech,2026-07-29
https://www.novexa.news/news/anf-to-approach-ihc-after-being-stopped-from-proceeding-with-fresh-recruitment,2026-07-29
https://www.novexa.news/news/govt-finally-revamps-oil-refining-policy-what-does-it-mean,2026-07-29
https://www.novexa.news/news/badenoch-calls-for-emergency-legislation-to-stop-early-release-scheme,2026-07-29
https://www.novexa.news/news/us-singer-d4vd-to-go-on-trial-for-murder-in-death-of-teen,2026-07-29
https://www.novexa.news/news/odyssey-translator-writes-scathing-review-of-nolan-film-adaptation,2026-07-29
https://www.novexa.news/news/israeli-forces-tear-gas-journalists-reporting-nablus-shootout,2026-07-29
https://www.novexa.news/news/us-walks-out-of-un-security-council-meeting-during-france-s-remarks,2026-07-29
https://www.novexa.news/news/we-are-not-learning-anything-india-s-gen-z-rage-is-a-test-for-modi,2026-07-29
https://www.novexa.news/news/england-s-langton-feared-for-gymnastics-future-after-fall,2026-07-29
https://www.novexa.news/news/darfur-weaponising-identity,2026-07-29
https://www.novexa.news/news/nasa-astronaut-chris-williams-to-discuss-space-station-mission,2026-07-29
https://www.novexa.news/news/norris-beats-hamilton-to-hungary-pole,2026-07-29
https://www.novexa.news/news/states-sue-to-stop-paramount-warner-bros-blockbuster-merger,2026-07-29
https://www.novexa.news/news/zidane-waited-for-france-now-can-he-harness-their-star-power,2026-07-29
https://www.novexa.news/news/marsh-stars-as-sunrisers-beat-brave,2026-07-29
https://www.novexa.news/news/in-washington-netanyahu-faces-a-delicate-balancing-act,2026-07-29
https://www.novexa.news/news/ai-sell-off-intensifies-as-investors-ditch-chip-stocks,2026-07-29
https://www.novexa.news/news/why-these-cancer-patients-face-a-lonely-fight,2026-07-29
https://www.novexa.news/news/pmd-forecasts-fresh-spell-of-monsoon-rains-across-country-from-july-29-to-august-5,2026-07-29
https://www.novexa.news/news/shots-fired-at-us-consulate-in-toronto-for-a-second-time-this-year,2026-07-28
https://www.novexa.news/news/on-the-frontline-fighting-the-uk-s-most-dangerous-plant,2026-07-28
https://www.novexa.news/news/tate-s-attorney-says-allegations-puts-a-target-on-their-backs,2026-07-28
https://www.novexa.news/news/war-criminal-protesters-confront-netanyahu-motorcade-in-washington-dc,2026-07-28
https://www.novexa.news/news/devastating-european-wildfires-in-maps-and-how-they-re-being-tackled,2026-07-28
https://www.novexa.news/news/typhoon-noul-makes-landfall-in-china-with-hundreds-of-thousands-evacuated,2026-07-28
https://www.novexa.news/news/even-before-attack-berlin-s-gay-community-felt-more-and-more-unsafe,2026-07-28
https://www.novexa.news/news/pirlo-out-of-italy-football-top-job-after-backlash-over-russian-betting-firm-links,2026-07-28
https://www.novexa.news/news/toy-company-ceo-shares-how-trump-apos-s-new-round-of-tariffs-could-affect-business,2026-07-28
https://www.novexa.news/news/mirpur-heads-to-polls-amid-barbs-warnings,2026-07-28
https://www.novexa.news/news/threads-users-can-now-chat-with-meta-ai-in-their-dms,2026-07-28
https://www.novexa.news/news/oil-price-slides-as-us-and-iran-pause-fire-cancer-treatments-help-astrazeneca-beat,2026-07-28
https://www.novexa.news/news/rental-searches-for-pet-friendly-properties-drop-after-law-change,2026-07-28
https://www.novexa.news/news/satya-nadella-says-companies-that-trust-one-ai-for-everything-may-not-survive,2026-07-28
https://www.novexa.news/news/from-haaland-love-to-mexico-s-merlin-26-memories-from-the-2026-world-cup,2026-07-28
https://www.novexa.news/news/is-it-time-to-stop-using-glue-and-labels-on-paper,2026-07-28
https://www.novexa.news/news/one-dead-14-injured-as-car-reportedly-strikes-crowd-at-berlin-lgbtq-event,2026-07-28
https://www.novexa.news/news/trump-says-iran-talks-taking-place-during-pause-in-us-military-strikes,2026-07-28
https://www.novexa.news/news/islamabad-high-court-dismisses-bank-petition-on-super-tax,2026-07-28
https://www.novexa.news/news/littler-sets-up-price-final-at-world-matchplay,2026-07-28
https://www.novexa.news/news/syrian-people-must-not-be-failed-again,2026-07-28
https://www.novexa.news/news/new-technical-education-routes-to-be-offered-at-14-in-england,2026-07-28
https://www.novexa.news/news/iran-warns-ukraine-of-retaliation-after-deadly-caspian-sea-strike,2026-07-28
https://www.novexa.news/news/trump-asks-us-supreme-court-to-allow-mail-in-voting-restrictions,2026-07-28
https://www.novexa.news/news/five-decades-of-israeli-covert-strategy-to-push-us-iran-into-confrontation,2026-07-28
https://www.novexa.news/news/could-mount-be-final-piece-in-man-utd-midfield-jigsaw,2026-07-28
https://www.novexa.news/news/chiesa-happy-but-wants-new-chapter-at-liverpool,2026-07-28
https://www.novexa.news/news/inter-in-advanced-talks-with-england-defender-stones,2026-07-28
https://www.novexa.news/news/liverpool-s-centre-back-situation-and-why-iraola-must-act,2026-07-28
https://www.novexa.news/news/i-thought-i-ve-tried-everything-else-why-not-give-ai-a-shot-the-long-lost-family,2026-07-28
https://www.novexa.news/news/what-drove-venezuela-s-decision-to-leave-the-icc,2026-07-28
https://www.novexa.news/news/war-on-iran-phase-ii-day-14,2026-07-28
https://www.novexa.news/news/spain-races-to-contain-blazes-before-temperatures-rise,2026-07-28
https://www.novexa.news/news/young-protesters-explain-why-india-s-streets-are-filling-with-anger,2026-07-28
https://www.novexa.news/news/newly-appointed-cnsc-aamer-raza-meets-cdf-asim-munir-in-rawalpindi-ispr,2026-07-27
https://www.novexa.news/news/un-rights-chief-turk-wins-second-term-despite-us-and-israeli-opposition,2026-07-27
https://www.novexa.news/news/students-staff-work-to-bring-the-islamic-university-of-gaza-back-to-life,2026-07-27
https://www.novexa.news/news/iran-war-live-trump-says-us-locked-and-loaded-as-it-seeks-iran-talks,2026-07-27
https://www.novexa.news/news/controversial-posts-case-ihc-rules-imaan-hadi-s-sentence-suspension-pleas-admissible,2026-07-27
https://www.novexa.news/news/icc-prosecutor-khan-removed-over-sexual-misconduct-allegations-sources,2026-07-27
https://www.novexa.news/news/charli-xcx-photo-purchased-by-national-portrait-gallery,2026-07-27
https://www.novexa.news/news/dutch-pair-banned-from-bali-after-run-club-excludes-locals,2026-07-27
https://www.novexa.news/news/bali-bans-dutch-expats-whose-run-club-allegedly-excluded-indonesians,2026-07-27
https://www.novexa.news/news/uk-s-iconic-jodrell-bank-telescope-faces-axe-in-science-cuts,2026-07-27
https://www.novexa.news/news/rain-returns-for-some-parts-of-the-uk,2026-07-27
https://www.novexa.news/news/pakistan-seize-control-but-hope-joseph-fight-on-as-wi-reach-303-7-at-lunch,2026-07-27
https://www.novexa.news/news/maybe-he-s-a-racist-trump-critical-of-james,2026-07-27
https://www.novexa.news/news/us-and-iran-hit-pause-on-strikes-for-second-day,2026-07-27
https://www.novexa.news/news/are-brain-waves-the-next-unlock-for-physical-ai,2026-07-27
https://www.novexa.news/news/van-bommel-appointed-belgium-head-coach,2026-07-27
https://www.novexa.news/news/spanish-pm-pedro-sanchez-thanks-young-gaza-artist-for-painting-him,2026-07-27
https://www.novexa.news/news/i-tried-out-openai-s-new-ai-keypad-which-will-be-fun-for-some-coders-and-slightly,2026-07-27
https://www.novexa.news/news/senators-question-devolved-ministries-revival,2026-07-27
https://www.novexa.news/news/sell-the-company-for-400-million-he-s-giving-it-away-instead,2026-07-27
https://www.novexa.news/news/saudi-led-coalition-strikes-houthi-controlled-hodeidah,2026-07-27
https://www.novexa.news/news/can-apple-make-smart-glasses-that-aren-t-a-constant-privacy-threat,2026-07-27
https://www.novexa.news/news/littler-wins-matchplay-and-smashes-taylor-record,2026-07-27
https://www.novexa.news/news/naqvi-inaugurates-modern-frontier-corps-hospital-in-turbat,2026-07-27
https://www.novexa.news/news/first-phase-of-ajk-polls-begins-in-mirpur-division-amid-allegations-of-rigging,2026-07-27
https://www.novexa.news/news/mass-shooting-kills-two-in-seattle-us-media,2026-07-27
https://www.novexa.news/news/trump-paused-attacks-on-iran-to-make-space-for-talks-us-ambassador-says,2026-07-27
https://www.novexa.news/news/houthis-claim-saudi-drone-downed-over-northwestern-yemen,2026-07-27
https://www.novexa.news/news/why-budding-birders-are-flocking-to-shazam-like-apps-to-identify-avians,2026-07-27
https://www.novexa.news/news/zelensky-claims-russia-helped-iran-target-us-bases-in-gulf,2026-07-27
https://www.novexa.news/news/how-china-s-push-for-a-more-inclusive-global-ai-order-offers-opportunities-for-pakistan,2026-07-27
https://www.novexa.news/news/russia-and-ukraine-trade-attacks-killing-10-including-child-in-chernihiv,2026-07-27
https://www.novexa.news/news/icc-member-states-decide-fate-of-embattled-prosecutor-karim-khan,2026-07-27
https://www.novexa.news/news/trump-says-eu-to-pay-very-big-price-for-google-fine,2026-07-27
https://www.novexa.news/news/macron-calls-crisis-meeting-as-wildfires-threaten-bordeaux-and-heatwave-looms,2026-07-27
https://www.novexa.news/news/nasa-s-escapade-snaps-family-portrait-of-earth-moon,2026-07-27
https://www.novexa.news/news/iran-war-forces-energy-buyers-to-unshackle-from-global-markets,2026-07-27
https://www.novexa.news/news/trump-threatens-eu-with-substantial-tariffs-over-fines-of-us-tech-giants,2026-07-27
https://www.novexa.news/news/what-lies-ahead-for-iran-s-economy-as-scope-of-us-war-grows-beyond-hormuz,2026-07-27
https://www.novexa.news/news/pakistan-s-ambitious-artificial-intelligence-steps,2026-07-27
https://www.novexa.news/news/scott-overcomes-pressure-and-big-pal-dean-to-give-scotland-golden-start,2026-07-27
https://www.novexa.news/news/mcinnes-banned-for-disgusting-celtic-penalty-remark,2026-07-27
https://www.novexa.news/news/prentis-new-ai-lab-co-founded-by-reid-hoffman-marc-pincus-in-talks-to-raise-100m,2026-07-27
https://www.novexa.news/news/ed-miliband-indicates-development-and-climate-will-be-at-heart-of-uk-foreign-policy,2026-07-27
https://www.novexa.news/news/modi-announces-panel-to-reform-india-s-exam-system-anti-govt-graffiti-at-jantar-mantar,2026-07-27
https://www.novexa.news/news/suspect-in-berlin-pride-attack-shot-dead-by-police,2026-07-27
https://www.novexa.news/news/venezuela-to-exit-international-criminal-court-accusing-it-of-bias,2026-07-27
https://www.novexa.news/news/in-reply-to-nawaz-bilawal-says-people-of-ajk-not-ready-to-bargain-away-their-rights-in,2026-07-27
https://www.novexa.news/news/typhoon-noul-batters-southeast-china,2026-07-27
https://www.novexa.news/news/norris-wins-his-first-grand-prix-of-year-in-hungary,2026-07-27
https://www.novexa.news/news/hugging-face-ceo-calls-for-radical-transparency-after-unprecedented-openai-hack,2026-07-27
https://www.novexa.news/news/israeli-crackdown-in-occupied-west-bank-intensifies-settlers-cause-mayhem,2026-07-27
https://www.novexa.news/news/israeli-air-strike-on-a-vehicle-in-gaza-kills-two-hamas-security-officials,2026-07-27
https://www.novexa.news/news/israeli-settlers-set-fire-to-mosques-cars-and-farm-land-in-west-bank-palestinians-say,2026-07-26
https://www.novexa.news/news/malaysia-to-host-rescheduled-bahrain-grand-prix-f1-race-in-october,2026-07-26
https://www.novexa.news/news/why-the-uk-cancelled-a-military-exercise-in-kenya-and-what-it-means,2026-07-26
https://www.novexa.news/news/berlin-police-search-for-suspect-in-fatal-attack-on-pride-parade,2026-07-26
https://www.novexa.news/news/u-s-iran-war-pauses-for-2nd-straight-day,2026-07-26
https://www.novexa.news/news/dpm-dar-stresses-need-to-build-on-islamabad-mou-commitments-in-meeting-with-iran-s,2026-07-26
https://www.novexa.news/news/adhd-looks-different-in-women-and-poses-unique-health-risks,2026-07-26
https://www.novexa.news/news/kids-and-adults-are-obsessed-with-squishy-toys-and-fidget-trading,2026-07-26
https://www.novexa.news/news/iran-s-sabre-rattling-should-not-intimidate-uk-wes-streeting-says,2026-07-26
https://www.novexa.news/news/israeli-settlers-torch-2-mosques-in-west-bank-palestinian-officials,2026-07-26
https://www.novexa.news/news/watch-at-the-scene-of-berlin-pride-attack-as-manhunt-continues,2026-07-26
https://www.novexa.news/news/after-chaotic-return-where-does-joshua-win-leave-fury-fight,2026-07-26
https://www.novexa.news/news/are-money-and-soft-power-draining-world-cup-football-of-its-magic-richard-partington,2026-07-26
https://www.novexa.news/news/war-dries-up-unofficial-dollar-inflows,2026-07-26
https://www.novexa.news/news/flood-level-in-chenab-eases-from-medium-to-low-pmd-forecasts-fresh-rain-spell-for-upper,2026-07-26
https://www.novexa.news/news/tunisians-mark-fifth-year-of-emergency-rule-with-calls-for-saied-to-go,2026-07-26
https://www.novexa.news/news/two-injured-as-ambulance-attacked-in-balochistan-s-musakhel,2026-07-26
https://www.novexa.news/news/sc-settles-jurisdictional-dispute-says-it-cannot-hear-nab-cases-transfers-them-to-fcc,2026-07-26
https://www.novexa.news/news/can-zimbabwe-s-mineral-ambitions-benefit-smaller-producers,2026-07-26
https://www.novexa.news/news/ravi-chenab-flood-levels-likely-to-reach-medium-to-high-levels-today,2026-07-26
https://www.novexa.news/news/nearly-400-sq-km-of-punjab-under-water-ravi-chenab-flood-levels-likely-to-reach-medium,2026-07-26
https://www.novexa.news/news/ravi-chenab-flood-levels-likely-to-reach-medium-to-high-today,2026-07-26
https://www.novexa.news/news/yemen-s-houthis-target-saudi-oil-facilities-along-the-red-sea,2026-07-26
https://www.novexa.news/news/what-s-behind-the-icc-investigation-into-karim-khan,2026-07-26
https://www.novexa.news/news/manager-garcia-to-leave-belgium-when-contract-expires,2026-07-26
https://www.novexa.news/news/two-buses-collide-in-syria-killing-at-least-35-people,2026-07-26
https://www.novexa.news/news/qr-codes-are-quietly-replacing-paper-at-more-wedding-receptions,2026-07-26
https://www.novexa.news/news/born-too-soon-premature-babies-fight-for-survival-in-gaza,2026-07-26
https://www.novexa.news/news/sean-mccann-brother-of-madeleine-to-swim-at-commonwealths,2026-07-25
https://www.novexa.news/news/bangladesh-president-mohammed-shahabuddin-resigns,2026-07-25
https://www.novexa.news/news/democrats-in-maine-gather-to-replace-graham-platner-in-the-race-against-susan-collins,2026-07-25
https://www.novexa.news/news/raisani-moves-bhc-against-abolition-of-kalat-division,2026-07-25
https://www.novexa.news/news/i-lost-my-home-twice-sudanese-mothers-caught-between-two-wars,2026-07-25
https://www.novexa.news/news/trump-returns-to-correspondents-apos-dinner-3-months-after-shooting,2026-07-25
https://www.novexa.news/news/waymo-reportedly-mulling-a-breakup-with-uber,2026-07-25
https://www.novexa.news/news/paramount-agrees-to-pause-warner-bros-deal-while-court-case-plays-out,2026-07-25
https://www.novexa.news/news/prentis-new-ai-lab-co-founded-by-reid-hoffman-mark-pincus-in-talks-to-raise-100m,2026-07-25
https://www.novexa.news/news/wildfires-in-spain-and-france-force-evacuation-of-200-000-people,2026-07-25
https://www.novexa.news/news/japan-records-its-first-cruelly-hot-day-as-cities-swelter-in-40-degree-heat,2026-07-25
https://www.novexa.news/news/brent-crude-climbs-past-100-as-middle-east-tensions-rattle-markets,2026-07-25
https://www.novexa.news/news/burnham-urged-to-award-2-4bn-military-satellite-contract-to-airbus-over-us-rival,2026-07-25
https://www.novexa.news/news/warning-shot-or-publicity-stunt-how-worried-should-we-be-about-the-openai-hack,2026-07-25
https://www.novexa.news/news/us-court-affirms-release-of-pro-palestine-scholar-as-legal-battle-continues,2026-07-25
https://www.novexa.news/news/fe-d-eral-tax-ombudsman-flags-error-in-fbr-s-refund-system,2026-07-25
https://www.novexa.news/news/openai-s-new-voice-mode-makes-it-to-the-chatgpt-desktop-app,2026-07-25
https://www.novexa.news/news/argentina-behaviour-after-world-cup-final-was-intolerable-says-de-la-fuente,2026-07-25
https://www.novexa.news/news/congress-party-holds-funeral-for-india-pm-modi-and-cabinet-ministers,2026-07-25
https://www.novexa.news/news/nba-superstar-james-41-to-join-philadelphia-76ers,2026-07-25
https://www.novexa.news/news/chris-brown-pleads-guilty-to-affray-over-nightclub-incident,2026-07-25
https://www.novexa.news/news/wildfire-survivors-tell-of-narrow-escape-as-spain-declares-emergency,2026-07-25
https://www.novexa.news/news/nasa-to-support-blue-origin-new-glenn-rocket-testing-advance-artemis,2026-07-25
https://www.novexa.news/news/terrorist-attack-on-joint-police-checkpost-in-kp-s-tank-martyrs-15-including-14-security,2026-07-25
https://www.novexa.news/news/buck-moon-set-to-light-up-sky,2026-07-25
https://www.novexa.news/news/meta-launches-new-facebook-marketplace-app-called-seller,2026-07-25
https://www.novexa.news/news/firefighters-struggle-to-contain-madrid-wildfires-as-more-than-140-000-evacuated-in,2026-07-25
https://www.novexa.news/news/us-summons-malaysia-envoy-over-israel-policy,2026-07-25
https://www.novexa.news/news/australia-world-cup-star-volpato-faces-speeding-cocaine-charges,2026-07-25
https://www.novexa.news/news/supreme-court-declares-hearing-bail-applications-in-pending-nab-appeals-is-fcc-s,2026-07-25
https://www.novexa.news/news/phoenix-all-out-for-64-as-hundred-batting-slump-continues,2026-07-25
https://www.novexa.news/news/expert-shares-how-trump-apos-s-new-round-of-tariffs-could-affect-americans,2026-07-25
https://www.novexa.news/news/security-forces-kill-4-terrorists-in-mastung-operation-interior-ministry,2026-07-25
https://www.novexa.news/news/india-pakistan-among-teams-handed-direct-asian-games-men-s-cricket-knockout-berths,2026-07-25
https://www.novexa.news/news/indian-activist-wangchuk-ends-26-day-hunger-strike,2026-07-25
https://www.novexa.news/news/david-squires-on-the-notable-people-and-big-moments-from-world-cup-2026,2026-07-25
https://www.novexa.news/news/burnham-urged-to-lobby-eu-leaders-directly-to-waive-new-border-controls,2026-07-25
https://www.novexa.news/news/in-kyrgyzstan-girls-compete-at-kok-boru-a-game-like-polo,2026-07-24
https://www.novexa.news/news/iran-war-and-trump-s-tariffs-threaten-a-resilient-us-economy,2026-07-24
https://www.novexa.news/news/anonymous-food-donations-reach-indian-student-protesters,2026-07-24
https://www.novexa.news/news/justice-dept-drops-apos-new-york-times-apos-subpoenas-under-pressure-from-judge,2026-07-24
https://www.novexa.news/news/techcrunch-brings-startup-battlefield-to-australia-with-stripe,2026-07-24
https://www.novexa.news/news/as-oil-soars-experts-watch-red-sea-tankers-for-clarity-on-houthi-blockade,2026-07-24
https://www.novexa.news/news/govt-to-unveil-strategy-to-curb-population-growth,2026-07-24
https://www.novexa.news/news/israeli-strikes-hit-gaza-city-as-reports-say-two-palestinians-were-killed,2026-07-24
https://www.novexa.news/news/why-iran-diplomacy-may-fail-without-stronger-mediation-support,2026-07-24
https://www.novexa.news/news/us-launches-13th-night-of-strikes-as-iran-warns-of-escalation-in-the-gulf,2026-07-24
https://www.novexa.news/news/a-million-panel-project,2026-07-24
https://www.novexa.news/news/elliot-anderson-calls-manchester-city-the-kings-of-manchester-after-116m-move,2026-07-24
https://www.novexa.news/news/how-heatwaves-may-affect-mental-health-and-what-can-help,2026-07-24
https://www.novexa.news/news/what-are-the-abraham-accords,2026-07-24
https://www.novexa.news/news/trump-weighs-major-strike-as-iran-s-araghchi-warns-talks-are-at-risk,2026-07-24
https://www.novexa.news/news/from-ancient-avocados-to-birdsong-science-stories-widen-the-lens,2026-07-24
https://www.novexa.news/news/trump-allies-weigh-changes-to-preservation-review-for-faster-federal-builds,2026-07-24
https://www.novexa.news/news/3-172-gender-violence-cases-reported-in-six-months,2026-07-24
https://www.novexa.news/news/corgi-reportedly-adds-funding-at-a-4-billion-valuation-in-rapid-fire-run,2026-07-24
https://www.novexa.news/news/protests-in-bologna-after-moroccan-born-man-dies-following-police-restraint,2026-07-24
https://www.novexa.news/news/pakistan-raises-petrol-and-diesel-prices-by-over-rs4-per-litre,2026-07-24
https://www.novexa.news/news/study-pinpoints-a-simple-pattern-behind-birdsong-s-rich-diversity,2026-07-24
https://www.novexa.news/news/oil-tops-100-as-red-sea-threat-revives-supply-fears,2026-07-24
https://www.novexa.news/news/google-adds-selfie-video-sign-in-as-a-backup-way-to-regain-access,2026-07-24
https://www.novexa.news/news/world-cup-tourism-boom-fell-short-for-some-host-cities-report-says,2026-07-24
https://www.novexa.news/news/trump-warns-of-bigger-strikes-on-iran-as-gulf-tensions-widen,2026-07-24
https://www.novexa.news/news/us-drops-subpoena-for-three-new-york-times-reporters-after-legal-pushback,2026-07-24
https://www.novexa.news/news/yemen-s-oil-exports-may-restart-but-recovery-remains-uncertain,2026-07-24
https://www.novexa.news/news/videos-prompt-outrage-after-police-shooting-in-wisconsin,2026-07-24
https://www.novexa.news/news/10-women-s-transfers-that-stood-out-while-the-men-s-world-cup-dominated,2026-07-24
https://www.novexa.news/news/us-moves-to-impose-tariffs-on-dozens-of-countries-over-forced-labour-concerns,2026-07-24
https://www.novexa.news/news/jes-staley-to-face-us-lawmakers-over-ties-to-jeffrey-epstein,2026-07-24
https://www.novexa.news/news/manchester-united-weigh-camavinga-and-berge-as-midfield-rebuild-continues,2026-07-24
https://www.novexa.news/news/rayner-rules-out-repaying-severance-after-returning-to-cabinet,2026-07-24
https://www.novexa.news/news/amazon-adds-games-to-prime-video-in-a-bid-to-broaden-entertainment-use,2026-07-24
https://www.novexa.news/news/musk-says-to-enjoy-the-ride-as-ai-anxieties-continue-to-grow,2026-07-24
https://www.novexa.news/news/pakistan-sees-sharp-drop-in-environmental-poliovirus-detections-in-2026,2026-07-24
https://www.novexa.news/news/more-than-100-uk-millionaires-urge-andy-burnham-to-raise-their-taxes,2026-07-24
https://www.novexa.news/news/england-cannot-afford-trip-to-amputee-world-cup-and-the-fa-will-not-help,2026-07-24
https://www.novexa.news/news/liverpool-issue-bans-as-1-2m-seized-from-ticket-touts,2026-07-24
https://www.novexa.news/news/several-killed-as-ukraine-russia-trade-attacks-deep-behind-the-front-line,2026-07-24
https://www.novexa.news/news/shapps-barred-from-conservative-comeback-as-badenoch-backs-party-reset,2026-07-24
https://www.novexa.news/news/oil-tops-100-again-as-middle-east-tensions-rattle-energy-markets,2026-07-24
https://www.novexa.news/news/elliot-anderson-s-rise-puts-him-at-the-centre-of-england-and-city-talk,2026-07-24
https://www.novexa.news/news/johnson-thompson-injury-rules-her-out-of-commonwealth-games,2026-07-23
https://www.novexa.news/news/tesla-profit-slips-as-revenue-rises-with-ai-and-robots-now-central,2026-07-23
https://www.novexa.news/news/aston-martin-secures-550m-loan-deal,2026-07-23
https://www.novexa.news/news/karachi-govt-colleges-tell-staff-to-follow-formal-dress-code-at-work,2026-07-23
https://www.novexa.news/news/angola-jails-two-russians-on-terrorism-and-spying-convictions,2026-07-23
https://www.novexa.news/news/white-house-backs-healthy-eating-message-while-cutting-snap-ed-funding,2026-07-23
https://www.novexa.news/news/servicenow-backs-indian-banking-software-firm-in-40-million-expansion-bet,2026-07-23
https://www.novexa.news/news/ford-adopts-apple-maps-tools-for-its-next-generation-of-evs,2026-07-23
https://www.novexa.news/news/sperm-whales-change-vowel-sounds-when-boats-are-nearby-scientists-discover,2026-07-23
https://www.novexa.news/news/openai-opens-chatgpt-health-tools-to-all-u-s-users,2026-07-23
https://www.novexa.news/news/us-iran-fighting-casts-a-shadow-over-asean-s-manila-agenda,2026-07-23
https://www.novexa.news/news/over-20-killed-in-northwest-nigeria-as-armed-gang-violence-spreads,2026-07-23
https://www.novexa.news/news/the-new-york-times-to-argue-white-house-is-using-legal-pressure-on-reporters,2026-07-23
https://www.novexa.news/news/nairobi-clinic-study-tests-an-ai-second-set-of-eyes-for-care,2026-07-23
https://www.novexa.news/news/oil-prices-move-higher-as-red-sea-tensions-add-supply-worries,2026-07-23
https://www.novexa.news/news/canada-cancels-joint-us-border-bridge-ceremony,2026-07-23
https://www.novexa.news/news/modi-promises-fast-track-punishment-as-indian-student-anger-over-exam-fraud-grows,2026-07-23
https://www.novexa.news/news/pakistan-says-over-20-health-deals-worth-629-5m-signed-with-china,2026-07-23
https://www.novexa.news/news/aurangzeb-reviews-imf-programme-progress-as-pakistan-touts-macro-gains,2026-07-23
https://www.novexa.news/news/bulgaria-approves-us-tanker-aircraft-deployment-amid-iran-tensions,2026-07-23
https://www.novexa.news/news/world-cup-2030-very-early-power-rankings-who-will-challenge-spain-at-top,2026-07-23
https://www.novexa.news/news/world-cup-fans-in-the-us-mexico-and-canada-soften-concerns-with-a-lively-summer,2026-07-23
https://www.novexa.news/news/rubio-says-iran-is-seeking-a-deal-with-the-us-as-strikes-continue,2026-07-23
https://www.novexa.news/news/unesco-flags-rohtas-fort-restoration-work-over-heritage-concerns,2026-07-23
https://www.novexa.news/news/iran-houthi-pressure-on-shipping-widens-as-us-strikes-continue,2026-07-23
https://www.novexa.news/news/israel-s-gaza-barrier-work-deepens-fears-of-a-lasting-partition,2026-07-23
https://www.novexa.news/news/paul-rowley-exits-st-helens-on-eve-of-derby-clash,2026-07-23
https://www.novexa.news/news/eu-levies-890m-fine-on-google-over-search-and-app-competition-breaches,2026-07-23
https://www.novexa.news/news/england-pubs-clubs-and-music-venues-set-for-20-business-rates-cut,2026-07-23
https://www.novexa.news/news/saudi-arabia-s-nuclear-pivot-why-an-oil-giant-wants-new-power,2026-07-23
https://www.novexa.news/news/the-browser-wars-aren-t-about-search-anymore-here-are-the-best-alternatives-to-chrome-and-safari,2026-07-23
https://www.novexa.news/news/zardari-urges-stronger-monsoon-readiness-as-heavy-rains-raise-flood-risks,2026-07-23
https://www.novexa.news/news/redistricting-has-reshaped-black-districts-in-six-republican-led-states,2026-07-23
https://www.novexa.news/news/norway-plans-fifa-complaint-over-balogun-red-card-reversal,2026-07-23
https://www.novexa.news/news/scarratt-joins-england-coaching-team-permanently,2026-07-23
https://www.novexa.news/news/arokodare-forces-wolves-training-to-be-cancelled,2026-07-23
https://www.novexa.news/news/us-to-announce-deal-allowing-saudi-arabia-a-nuclear-programme-reports-say,2026-07-23
https://www.novexa.news/news/what-business-leaders-say-really-helps-candidates-stand-out-in-hiring,2026-07-23
https://www.novexa.news/news/ibm-says-ai-is-pressuring-hardware-budgets-not-ending-the-mainframe-era,2026-07-23
https://www.novexa.news/news/cameron-menzies-falls-ill-during-world-matchplay-clash-in-blackpool,2026-07-23
https://www.novexa.news/news/ukraine-s-new-military-chief-vows-tougher-retaliation-as-war-grinds-on,2026-07-23
https://www.novexa.news/news/pakistan-backs-syrian-led-transitional-justice-rejects-outside-solutions,2026-07-23
https://www.novexa.news/news/houthis-say-they-hit-oil-tankers-as-us-expands-strikes-on-iran,2026-07-23
https://www.novexa.news/news/us-strikes-reported-in-iran-as-tensions-widen-with-saudi-tanker-attacks,2026-07-23
https://www.novexa.news/news/substack-s-new-tool-tells-you-who-s-been-writing-their-newsletters-with-ai,2026-07-23
https://www.novexa.news/news/the-bezos-factor-unpicking-puzzle-of-liverpool-s-potential-investors,2026-07-23
https://www.novexa.news/news/algeria-toxic-colonisation,2026-07-23
https://www.novexa.news/news/clarity-act-faces-senate-fight-over-crypto-sales-by-presidents,2026-07-23
https://www.novexa.news/news/nasa-sets-briefings-for-spacex-crew-13-mission-to-space-station,2026-07-23
https://www.novexa.news/news/anthony-joshua-says-friends-deaths-have-not-fully-sunk-in-before-next-fight,2026-07-23
https://www.novexa.news/news/video-shows-indian-police-accused-of-pellet-gun-use-against-protesters,2026-07-23
https://www.novexa.news/news/if-you-pay-a-hacker-s-ransom-chances-are-that-they-ll-come-back-for-more,2026-07-23
https://www.novexa.news/news/court-dismisses-pti-protest-crackdown-complaint-against-shehbaz-sharif,2026-07-23
https://www.novexa.news/news/nasa-earth-observatory-shows-winter-light-over-washington-s-olympic-mountains,2026-07-23
https://www.novexa.news/news/houthis-say-they-attacked-two-saudi-oil-tankers-in-the-red-sea,2026-07-23
https://www.novexa.news/news/houthis-claim-red-sea-tanker-attacks-as-us-strikes-iran-extend-to-12th-night,2026-07-23
https://www.novexa.news/news/ukrainian-drone-strikes-test-wildberries-and-russian-retail-logistics,2026-07-23
https://www.novexa.news/news/her-son-was-killed-by-ice-at-a-traffic-stop-she-says-she-apos-s-still-waiting-for-justice,2026-07-23
https://www.novexa.news/news/villa-agree-loan-deal-for-chelsea-winger-garnacho,2026-07-23
https://www.novexa.news/news/airport-drop-off-fees-reach-10-at-some-uk-hubs-as-charges-rise,2026-07-23
https://www.novexa.news/news/a-new-look-and-sound-for-messier-94,2026-07-23
https://www.novexa.news/news/google-s-ai-spending-is-surging-as-investors-watch-the-cash-burn,2026-07-23
https://www.novexa.news/news/oasis-overtake-the-beatles-in-all-time-uk-album-chart,2026-07-23
https://www.novexa.news/news/ppp-chairman-calls-upcoming-ajk-elections-most-significant-in-history,2026-07-23
https://www.novexa.news/news/science-corporation-s-vision-restoring-chip-wins-eu-approval,2026-07-23
https://www.novexa.news/news/tesla-spending-rises-as-factory-timelines-slip-on-key-new-products,2026-07-23
https://www.novexa.news/news/hitler-s-birth-place-in-austria-is-now-a-police-station,2026-07-23
https://www.novexa.news/news/iran-warns-us-pressure-could-trigger-wider-regional-instability,2026-07-23
https://www.novexa.news/news/alphabet-s-profit-jumps-as-ai-spending-and-cloud-demand-lift-results,2026-07-23
https://www.novexa.news/news/jofra-didn-t-bother-archer-accepts-his-fate-after-run-out-mistake,2026-07-23
https://www.novexa.news/news/hitler-s-austrian-birthplace-transformed-into-police-station,2026-07-23
https://www.novexa.news/news/google-s-cloud-growth-helps-defend-heavy-ai-spending-as-profits-climb,2026-07-23
https://www.novexa.news/news/people-with-secret-safe-phones-advised-to-turn-off-devices-during-national-test-of-ausalert-emergency-warning,2026-07-23
https://www.novexa.news/news/iran-s-neighbors-long-for-a-deal-any-deal-to-end-the-war,2026-07-23
https://www.novexa.news/news/travis-kalanick-s-robotics-company-raises-1-7b-led-by-a16z,2026-07-23
https://www.novexa.news/news/nasa-s-juno-peers-beneath-io-s-surface,2026-07-23
`;

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not established");
  const articlesCol = db.collection("news_website");

  const allDbArticles = await articlesCol.find({}, {
    projection: {
      slug: 1,
      title: 1,
      status: 1,
      reviewStatus: 1,
      generationMode: 1
    }
  }).toArray();

  const dbSlugMap = new Map(allDbArticles.map(doc => [doc.slug, doc]));

  const lines = userPastedCsv.trim().split("\n").slice(1);
  const rawUrls = lines.map(line => line.split(",")[0].trim()).filter(Boolean);

  const categoryUrls: string[] = [];
  const homepageUrls: string[] = [];
  const articleUrls: { rawUrl: string; slug: string }[] = [];

  for (const rawUrl of rawUrls) {
    if (rawUrl === "https://www.novexa.news/" || rawUrl === "https://www.novexa.news") {
      homepageUrls.push(rawUrl);
    } else if (rawUrl.includes("/category/")) {
      categoryUrls.push(rawUrl);
    } else {
      const slug = rawUrl.replace("https://www.novexa.news/news/", "").replace(/\/$/, "").trim();
      articleUrls.push({ rawUrl, slug });
    }
  }

  const missingUrls: { rawUrl: string; slug: string }[] = [];
  const draftArticles: any[] = [];
  const unindexablePublished: any[] = [];
  const validPublished: any[] = [];

  for (const item of articleUrls) {
    let doc = dbSlugMap.get(item.slug);
    
    if (!doc && item.slug.includes("apos")) {
      const normalizedSlug = item.slug.replaceAll("-apos-s-", "-s-").replaceAll("-apos-", "-").replaceAll("apos-", "");
      doc = dbSlugMap.get(normalizedSlug);
    }

    if (!doc) {
      missingUrls.push({ rawUrl: item.rawUrl, slug: item.slug });
    } else {
      const indexable = isArticleIndexable(doc);

      if (doc.status !== "published" || doc.reviewStatus === "rejected") {
        draftArticles.push({ url: item.rawUrl, slug: item.slug, id: doc._id, status: doc.status, reviewStatus: doc.reviewStatus, title: doc.title });
      } else if (!indexable) {
        unindexablePublished.push({ url: item.rawUrl, slug: item.slug, id: doc._id, title: doc.title });
      } else {
        validPublished.push({ url: item.rawUrl, slug: item.slug, dbSlug: doc.slug });
      }
    }
  }

  console.log("================ PASTED GSC LIST AUDIT SUMMARY ================");
  console.log(`Total URLs in Pasted List: ${rawUrls.length}`);
  console.log(`Homepage URLs (200 OK): ${homepageUrls.length}`);
  console.log(`Category Page URLs (200 OK): ${categoryUrls.length}`);
  console.log(`Article URLs analyzed: ${articleUrls.length}`);
  console.log(`  -> 🟢 Fully Valid Published & Indexable (200 OK): ${validPublished.length}`);
  console.log(`  -> 🟡 Draft / Unpublished Articles in DB (Returns 404): ${draftArticles.length}`);
  console.log(`  -> 🟠 Published Articles with Quality/Boilerplate Issues (Returns 404): ${unindexablePublished.length}`);
  console.log(`  -> 🔴 Completely Missing Slugs in DB (Returns 404): ${missingUrls.length}`);
  console.log("=================================================================\n");
}

run().catch(console.error).finally(() => mongoose.disconnect());
