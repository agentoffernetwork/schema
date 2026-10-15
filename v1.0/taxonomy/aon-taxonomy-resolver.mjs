import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const taxonomyPath = resolve(here, 'aon-taxonomy-v1.json');

export const levelOneOverrides = new Map([
  ['Apparel', 'fashion_apparel'],
  ['Arts & Entertainment', 'arts_entertainment'],
  ['Autos & Vehicles', 'automotive'],
  ['Beauty & Personal Care', 'beauty_personal_care'],
  ['Business & Industrial', 'business_industrial'],
  ['Computers & Consumer Electronics', 'computers_electronics'],
  ['Dining & Nightlife', 'dining_nightlife'],
  ['Family & Community', 'family_community'],
  ['Finance', 'finance'],
  ['Food & Groceries', 'food_grocery'],
  ['Health', 'health'],
  ['Hobbies, Games & Leisure', 'hobbies_games_leisure'],
  ['Home & Garden', 'home_garden'],
  ['Internet & Telecom', 'internet_telecom'],
  ['Jobs & Education', 'jobs_education'],
  ['Law & Government', 'law_government'],
  ['Mobile App Utilities', 'mobile_utilities'],
  ['News, Books & Publications', 'news_books_publications'],
  ['Occasions & Gifts', 'gifts_occasions'],
  ['Others', 'others'],
  ['Real Estate', 'real_estate'],
  ['Sports & Fitness', 'sports_fitness'],
  ['Travel & Tourism', 'travel_tourism'],
  // AON taxonomy v2 roots whose display names do not slug to their ids.
  ['AI, Software & Digital Services', 'ai_software_services'],
  ['Physical Goods', 'retail_goods'],
  ['Travel', 'travel_hospitality'],
]);

export const childSlugOverrides = new Map([
  ['finance.investing|Crypto & Digital Assets', 'crypto_and_digital_assets'],
  // AON taxonomy v2 nodes keep their v2 display names; ids follow the v2 spec.
  ['ai_software_services|AI Assistants & Agents', 'ai_assistant'],
  ['ai_software_services.ai_assistant|Autonomous AI Agents', 'ai_agents'],
  ['ai_software_services.ai_assistant|General & Personal AI Assistants', 'general_personal_assistants'],
  ['ai_software_services|Business & Productivity Software', 'ai_business_productivity'],
  ['ai_software_services.ai_business_productivity|CRM, Sales & Marketing', 'crm_marketing'],
  ['ai_software_services.ai_business_productivity|Customer Support & Chatbots', 'customer_support'],
  ['ai_software_services.ai_business_productivity|E-Commerce & POS Software', 'ecommerce_pos'],
  ['ai_software_services.ai_business_productivity|File Storage, Sharing & Backup', 'file_storage_sharing'],
  ['ai_software_services.ai_business_productivity|Accounting & Finance Software', 'finance_accounting'],
  ['ai_software_services.ai_business_productivity|HR, Payroll & Recruiting Software', 'hr_payroll'],
  ['ai_software_services.ai_business_productivity|Industry & Learning Systems', 'industry_systems'],
  ['ai_software_services.ai_business_productivity|Meetings, Chat & Email', 'meetings_collaboration'],
  ['ai_software_services.ai_business_productivity|Project Management & Automation', 'project_automation'],
  ['ai_software_services.ai_business_productivity|Writing, Translation & Transcription', 'writing_translation'],
  ['ai_software_services|Developer Tools & Website Builders', 'ai_coding_dev'],
  ['ai_software_services.ai_coding_dev|IDEs & Developer Tools', 'dev_tools_ides'],
  ['ai_software_services|Creative & Design Software', 'ai_creative_software'],
  ['ai_software_services.ai_creative_software|Image Generation & Photo Editing', 'image_photo'],
  ['ai_software_services.ai_creative_software|3D, Animation & CAD', 'modeling_3d_cad'],
  ['ai_software_services.ai_creative_software|Stock Media & Creative Assets', 'stock_media_assets'],
  ['ai_software_services.ai_creative_software|Video Generation & Editing', 'video_creation'],
  ['ai_software_services|Cloud, Hosting & APIs', 'developer_cloud_infra'],
  ['ai_software_services.developer_cloud_infra|AI Model APIs & Inference', 'ai_model_apis'],
  ['ai_software_services.developer_cloud_infra|Cloud Compute & GPUs', 'cloud_compute_gpu'],
  ['ai_software_services.developer_cloud_infra|Databases & Developer Storage', 'databases_object_storage'],
  ['ai_software_services.developer_cloud_infra|Web Hosting, Domains & CDN', 'hosting_domains_cdn'],
  ['ai_software_services.developer_cloud_infra|Proxies & Scraping APIs', 'proxies_scraping'],
  ['ai_software_services|Security & Utility Software', 'utility_security_software'],
  ['ai_software_services.utility_security_software|Device & Everyday Utilities', 'everyday_utilities'],
  ['digital_entertainment.adult_entertainment|Adult Dating & Hookup', 'adult_dating'],
  ['digital_entertainment.adult_entertainment|Adult Live Chat & AI', 'adult_live_ai'],
  ['digital_entertainment|E-books, Comics & News', 'digital_reading_news'],
  ['digital_entertainment.digital_reading_news|Comics, Manga & Webtoons', 'comics_manga'],
  ['digital_entertainment.digital_reading_news|E-books & Book Summaries', 'ebooks'],
  ['digital_entertainment.digital_reading_news|Web Novels & Serial Fiction', 'web_novels'],
  ['digital_entertainment|Game Top-Ups, Subscriptions & Stores', 'game_currency_subscriptions'],
  ['digital_entertainment.game_currency_subscriptions|Game Stores, Marketplaces & Services', 'game_stores_marketplaces'],
  ['digital_entertainment.game_currency_subscriptions|Game Memberships & Cloud Gaming', 'game_subscriptions'],
  ['digital_entertainment.game_currency_subscriptions|Game Top-Ups & Add-ons', 'game_topup_addons'],
  ['digital_entertainment|Betting, Casino & Lottery', 'igaming'],
  ['digital_entertainment.igaming|Lottery & Prize Draws', 'lottery_draws'],
  ['digital_entertainment.mobile_games.action|Action Adventure & Horror', 'action_adventure'],
  ['digital_entertainment.mobile_games.casual_puzzle|Hypercasual, Arcade & Runner', 'hypercasual_arcade'],
  ['digital_entertainment.mobile_games.casual_puzzle|Logic, Sort, Jigsaw & Coloring', 'logic_sort'],
  ['digital_entertainment.mobile_games.casual_puzzle|Party & Social Deduction', 'party_social'],
  ['digital_entertainment.mobile_games.casual_puzzle|Spin/Dice & Build', 'spin_and_build'],
  ['digital_entertainment.mobile_games|Role-Playing', 'rpg'],
  ['digital_entertainment.mobile_games.rpg|Squad & Turn-Based RPG', 'squad_turn_based'],
  ["digital_entertainment.mobile_games.shooter|Shoot 'em Up", 'shmup'],
  ['digital_entertainment.mobile_games|Simulation & Management', 'simulation'],
  ['digital_entertainment.mobile_games.simulation|Sandbox & Survival Crafting', 'sandbox_survival'],
  ['digital_entertainment.mobile_games.simulation|Tycoon, Farm & City', 'tycoon_building'],
  ['digital_entertainment.mobile_games.simulation|Vehicle & Job Simulator', 'vehicle_job_sim'],
  ['digital_entertainment.mobile_games.social_casino|Bingo & Keno', 'bingo'],
  ['digital_entertainment.mobile_games.social_casino|Poker & Table Games', 'poker_table'],
  ['digital_entertainment.mobile_games.sports_racing|Sports Management & Free Fantasy', 'sports_management'],
  ['digital_entertainment.mobile_games.strategy|Card Battler & Auto Battler', 'card_battler'],
  ['digital_entertainment.mobile_games|Card, Board & Tabletop', 'tabletop_card_board'],
  ['digital_entertainment.mobile_games.tabletop_card_board|Board & Dice Games', 'board_games'],
  ['digital_entertainment.pc_console_games|Action & Adventure', 'action'],
  ['digital_entertainment.pc_console_games.action|Action Adventure & Horror', 'action_adventure'],
  ['digital_entertainment.pc_console_games.action|Platformer & Metroidvania', 'platformer'],
  ['digital_entertainment.pc_console_games|Casual, Puzzle, Story & Party', 'casual_puzzle'],
  ['digital_entertainment.pc_console_games.casual_puzzle|Party, Rhythm & Family', 'party_rhythm'],
  ['digital_entertainment.pc_console_games|Role-Playing', 'rpg'],
  ['digital_entertainment.pc_console_games.rpg|Action RPG & Soulslike', 'action_rpg'],
  ['digital_entertainment.pc_console_games.rpg|Turn-Based RPG (JRPG / CRPG)', 'turn_based_rpg'],
  ['digital_entertainment.pc_console_games|Simulation & Management', 'simulation'],
  ['digital_entertainment.pc_console_games.simulation|Home, Life & Farming', 'home_life'],
  ['digital_entertainment.pc_console_games.simulation|Sandbox & Survival Crafting', 'sandbox_survival'],
  ['digital_entertainment.pc_console_games.simulation|City, Colony & Tycoon', 'tycoon_building'],
  ['digital_entertainment.pc_console_games.simulation|Vehicle & Job Simulator', 'vehicle_job_sim'],
  ['digital_entertainment.pc_console_games.strategy|Real-Time Strategy & Tower Defense', 'real_time_strategy'],
  ['digital_entertainment.pc_console_games.strategy|4X, Grand Strategy & Tactics', 'turn_based_4x'],
  ['digital_entertainment.pc_console_games.strategy|War & Empire Building', 'war_base_building'],
  ['digital_entertainment|Short Dramas', 'short_drama'],
  ['digital_entertainment.social_live_dating|Dating Sites & Matrimony', 'dating'],
  ['digital_entertainment.social_live_dating|Live Streaming, Voice Rooms & Gifting', 'live_social_gifting'],
  ['digital_entertainment|Music, Podcasts & Audiobooks', 'streaming_music_audio'],
  ['digital_entertainment.streaming_music_audio|Audiobooks & Audio Series', 'audiobooks'],
  ['digital_entertainment.streaming_music_audio|Music Streaming & Radio', 'music_streaming'],
  ['digital_entertainment|Video Streaming', 'streaming_video'],
  ['digital_entertainment.streaming_video|Live TV & FAST', 'live_tv'],
  ['digital_entertainment.streaming_video|On-Demand Film & TV', 'on_demand_streaming'],
  ['digital_entertainment.streaming_video|Online Video Platforms (UGC)', 'online_video_platforms'],
  ['education_careers|Adult Courses & Certifications', 'courses_certifications'],
  ['education_careers.courses_certifications|Adult Exams & Test Prep', 'adult_exam_prep'],
  ['education_careers.courses_certifications|Professional & Digital Skill Courses', 'skill_courses'],
  ['education_careers|Degrees & University Admissions', 'higher_education_degrees'],
  ["education_careers.higher_education_degrees|Bachelor's Degrees", 'bachelors_degrees'],
  ["education_careers.higher_education_degrees|Master's, MBA & Doctorate", 'masters_doctorate'],
  ['education_careers.higher_education_degrees|Admissions, Scholarships & Study Abroad', 'study_abroad_admissions'],
  ['education_careers|Jobs & Careers', 'jobs_career_services'],
  ['education_careers.jobs_career_services|Freelance & Gig Work Platforms', 'freelance_gig_work'],
  ['education_careers.jobs_career_services|Job Platforms & Recruiting', 'job_platforms'],
  ['education_careers.jobs_career_services|Work & Volunteer Abroad', 'work_abroad_programs'],
  ['education_careers|Kids & K-12 Learning', 'kids_k12_learning'],
  ["education_careers.kids_k12_learning|Kids' Enrichment Classes", 'kids_enrichment'],
  ['education_careers.kids_k12_learning|School & Entrance Exam Prep', 'school_entrance_exams'],
  ['education_careers.kids_k12_learning|Tutoring & Homework Help', 'tutoring_homework'],
  ['education_careers.language_learning|Self-Study Language Learning', 'self_study_language'],
  ['education_careers.language_learning|Language Tutors & Classes', 'tutors_classes'],
  ['financial_services|Bank Accounts', 'banking_accounts'],
  ['financial_services.banking_accounts|Checking & Digital Accounts', 'checking_accounts'],
  ['financial_services.credit_cards|Low-Rate & Balance-Transfer Cards', 'low_rate_balance_transfer'],
  ['financial_services.credit_cards|Secured & Credit-Builder Cards', 'secured_credit_builder'],
  ['financial_services.crypto_web3|DeFi, NFTs & dApps', 'defi_nft_dapps'],
  ['financial_services.crypto_web3|Crypto Exchanges & Trading', 'exchanges_trading'],
  ['financial_services.crypto_web3|Crypto Wallets, Cards & Payments', 'wallets_cards_payments'],
  ['financial_services.donations_fundraising|Crowdfunding & Fundraisers', 'crowdfunding_fundraising'],
  ['financial_services|E-Wallets & Payments', 'ewallet_payments'],
  ['financial_services.ewallet_payments|E-Wallets & UPI', 'ewallets_upi'],
  ['financial_services.ewallet_payments|Merchant Payments & Acquiring', 'merchant_payments'],
  ['financial_services.ewallet_payments|Remittances & Money Transfers', 'remittances_transfers'],
  ['financial_services.insurance_protection|Device Protection & Warranties', 'device_warranties'],
  ['financial_services.insurance_protection|Life & Disability Insurance', 'life_insurance'],
  ['financial_services|Loans & BNPL', 'lending'],
  ['financial_services.lending|Buy Now, Pay Later', 'bnpl'],
  ['financial_services.lending|Cash Advances & Earned Wage Access', 'cash_advance_ewa'],
  ['financial_services.lending|Mortgages & Home Loans', 'home_loans'],
  ['financial_services|Budgeting, Credit & Tax', 'money_management_tax'],
  ['financial_services.money_management_tax|Credit Scores, Monitoring & Repair', 'credit_monitoring_repair'],
  ['financial_services.money_management_tax|Debt Relief & Counselling', 'debt_relief'],
  ['financial_services.money_management_tax|Tax Filing & Preparation', 'tax_filing'],
  ['financial_services|Cashback, Coupons & Rewards', 'rewards_cashback_loyalty'],
  ['financial_services.rewards_cashback_loyalty|Cashback, Coupons & Earn-Rewards', 'cashback_earn_rewards'],
  ['financial_services.rewards_cashback_loyalty|Coalition Points Programs', 'coalition_points'],
  ['financial_services.rewards_cashback_loyalty|Free Sweepstakes & Samples', 'sweepstakes_samples'],
  ['financial_services|Investing & Wealth', 'wealth_investment_planning'],
  ['financial_services.wealth_investment_planning|Financial Advice & Wealth Management', 'financial_advice'],
  ['financial_services.wealth_investment_planning|Investing & Trading Platforms', 'investing_platforms'],
  ['financial_services.wealth_investment_planning|Gold & Precious Metals', 'precious_metals'],
  ['local_lifestyle_services|Beauty, Wellness & Fitness Services', 'beauty_wellness_fitness'],
  ['local_lifestyle_services.beauty_wellness_fitness|Online Fitness & Wellness Programs', 'digital_fitness_wellness'],
  ['local_lifestyle_services.beauty_wellness_fitness|Nails, Lashes, Brows & Waxing', 'nail_lash_brow'],
  ['local_lifestyle_services.beauty_wellness_fitness|Spas, Massage & Bathhouses', 'spa_massage'],
  ['local_lifestyle_services|Courier & Parcel Delivery', 'courier_delivery'],
  ['local_lifestyle_services.courier_delivery|On-Demand Couriers & Vans', 'on_demand_couriers'],
  ['local_lifestyle_services.courier_delivery|Parcel Forwarding & Shop-and-Ship', 'parcel_forwarding'],
  ['local_lifestyle_services.courier_delivery|Parcel & Document Shipping', 'parcel_shipping'],
  ['local_lifestyle_services.food_delivery_takeaway|Food Delivery Memberships', 'delivery_memberships'],
  ['local_lifestyle_services.food_delivery_takeaway|Food Delivery Platforms', 'delivery_platforms'],
  ['local_lifestyle_services.food_delivery_takeaway|Tiffin & Daily Meal Subscriptions', 'meal_subscriptions'],
  ['local_lifestyle_services.health_medical_services|Care Memberships & Discount Plans', 'care_memberships'],
  ['local_lifestyle_services.health_medical_services|Health Checkups & Diagnostics', 'checkups_diagnostics'],
  ['local_lifestyle_services.health_medical_services|Therapy & Mental Health', 'mental_health'],
  ['local_lifestyle_services.health_medical_services|Physiotherapy & Rehab', 'physio_rehab'],
  ['local_lifestyle_services.home_services|Renovation & Interior Design', 'renovation_interiors'],
  ['local_lifestyle_services.home_services|Repairs, Installation & Maintenance', 'repair_installation'],
  ['local_lifestyle_services|Events, Cinema & Leisure', 'local_entertainment_leisure'],
  ['local_lifestyle_services.local_entertainment_leisure|Activity Venues & Games', 'activity_venues'],
  ['local_lifestyle_services.local_entertainment_leisure|Bars, Nightlife & Karaoke', 'nightlife_karaoke'],
  ['local_lifestyle_services.local_entertainment_leisure|Concert, Show & Festival Tickets', 'show_event_tickets'],
  ['local_lifestyle_services|Rides, Transit & Car Services', 'mobility_auto_services'],
  ['local_lifestyle_services.mobility_auto_services|Car Wash, Repair & Roadside', 'car_care_repair'],
  ['local_lifestyle_services.mobility_auto_services|EV Charging & Fuel Services', 'charging_fuel_services'],
  ['local_lifestyle_services.mobility_auto_services|Ride-Hailing, Taxis & Carpooling', 'ride_hailing_taxi'],
  ['local_lifestyle_services.mobility_auto_services|Airport Transfers & Chauffeurs', 'transfers_chauffeurs'],
  ['local_lifestyle_services|Personal & Family Services', 'personal_services'],
  ['local_lifestyle_services.personal_services|Astrology, Faith & Spiritual Services', 'astrology_spiritual'],
  ['local_lifestyle_services.personal_services|Childcare & Babysitting', 'childcare'],
  ['local_lifestyle_services.personal_services|Postpartum & Confinement Care', 'confinement_postnatal_care'],
  ['local_lifestyle_services.personal_services|Elder Care & Care Homes', 'elder_care'],
  ['local_lifestyle_services.personal_services|Matchmaking Agencies & Coaching', 'matchmaking_coaching'],
  ['local_lifestyle_services.personal_services|Photography & Portraits', 'photography'],
  ['local_lifestyle_services.personal_services|Tailoring, Styling & Repairs', 'tailoring_repairs'],
  ['local_lifestyle_services.personal_services|Weddings, Events & Catering', 'weddings_events'],
  ['local_lifestyle_services.pet_services|Boarding & Day Care', 'boarding_daycare'],
  ['local_lifestyle_services.pet_services|Pet Grooming Services', 'grooming_salons'],
  ['local_lifestyle_services.pet_services|Pet Sitting & Dog Walking', 'sitting_walking'],
  ['local_lifestyle_services.pet_services|Vet Clinics & Pet Hospitals', 'vet_clinics_hospitals'],
  ['local_lifestyle_services.real_estate_housing|Commercial Property Sales', 'commercial_sales'],
  ['local_lifestyle_services.real_estate_housing|Residential Buying & Selling', 'residential_sales'],
  ['local_lifestyle_services.real_estate_housing|Timeshare & Vacation Ownership', 'timeshare_ownership'],
  ['local_lifestyle_services|Dining Out & Reservations', 'restaurant_dining_reservations'],
  ['local_lifestyle_services.restaurant_dining_reservations|Dining Memberships & Discount Programs', 'dining_memberships'],
  ['local_lifestyle_services|Telecom, Utilities & Home Monitoring', 'telecom_utilities'],
  ['local_lifestyle_services.telecom_utilities|Electricity, Gas & Water', 'energy_water'],
  ['local_lifestyle_services.telecom_utilities|Mobile Plans & Recharges', 'mobile_plans'],
  ['local_lifestyle_services.telecom_utilities|Cable & Satellite TV', 'pay_tv'],
  ['local_lifestyle_services.telecom_utilities|Residential Solar Plans', 'solar_energy_services'],
  ['retail_goods|Vehicles & Automotive', 'automotive_vehicles'],
  ['retail_goods.automotive_vehicles.car_electronics|Car Audio & Infotainment', 'audio_infotainment'],
  ['retail_goods.automotive_vehicles.car_electronics|GPS, Trackers & Car Security', 'gps_trackers'],
  ['retail_goods.automotive_vehicles.car_electronics|Phone Mounts & Car Chargers', 'phone_mounts_chargers'],
  ['retail_goods.automotive_vehicles|Car Care & Maintenance', 'care_maintenance'],
  ['retail_goods.automotive_vehicles.care_maintenance|Car Tools & Garage Equipment', 'car_tools_equipment'],
  ['retail_goods.automotive_vehicles|Interior & Exterior Accessories', 'interior_exterior'],
  ['retail_goods.automotive_vehicles.interior_exterior|Seat Covers & Floor Mats', 'seat_covers_mats'],
  ['retail_goods.automotive_vehicles|Motorcycle Riding Gear', 'motorcycle_gear'],
  ['retail_goods.automotive_vehicles.motorcycle_gear|Motorcycle Helmets', 'helmets'],
  ['retail_goods.automotive_vehicles|Vehicle Parts', 'parts'],
  ['retail_goods.automotive_vehicles.vehicles|Cars & SUVs', 'cars'],
  ['retail_goods.automotive_vehicles.vehicles|Motorcycles & Scooters', 'motorcycles'],
  ['retail_goods.baby_maternity|Baby Activity Gear', 'activity_gear'],
  ['retail_goods.baby_maternity.activity_gear|Bouncers, Rockers & Swings', 'bouncers_swings'],
  ['retail_goods.baby_maternity.activity_gear|Play Mats, Mobiles & Soothers', 'play_mats_soothers'],
  ['retail_goods.baby_maternity|Diapering & Potty', 'diapering'],
  ['retail_goods.baby_maternity.diapering|Diapers & Pants', 'diapers'],
  ['retail_goods.baby_maternity|Keepsakes, Photo Props & Gift Sets', 'keepsakes_gifts'],
  ['retail_goods.baby_maternity.keepsakes_gifts|Keepsakes & Baby Gift Sets', 'keepsakes_gift_sets'],
  ['retail_goods.baby_maternity.keepsakes_gifts|Newborn Photography Props', 'newborn_photo_props'],
  ['retail_goods.baby_maternity|Maternity & Postpartum Care', 'maternity_postpartum'],
  ['retail_goods.baby_maternity.nursery_sleep|Baby Bedding & Swaddles', 'bedding_swaddles'],
  ['retail_goods.baby_maternity.nursery_sleep|Cribs, Bassinets & Play Yards', 'cribs_bassinets'],
  ['retail_goods.baby_maternity|Baby Safety, Health & Bath', 'safety_health'],
  ['retail_goods.baby_maternity.safety_health|Health, Grooming & Teething', 'health_grooming'],
  ['retail_goods.baby_maternity|Strollers, Car Seats & Carriers', 'transport_travel'],
  ['retail_goods.baby_maternity.transport_travel|Baby Carriers & Slings', 'carriers_slings'],
  ['retail_goods.baby_maternity.transport_travel|Strollers & Prams', 'strollers'],
  ['retail_goods.baby_maternity.transport_travel|Stroller & Car Seat Accessories', 'transport_accessories'],
  ['retail_goods.beauty_personal_care.bath_body|Body Lotions & Oils', 'body_moisturizers'],
  ['retail_goods.beauty_personal_care.bath_body|Deodorants & Antiperspirants', 'deodorants'],
  ['retail_goods.beauty_personal_care|Beauty Tools & Devices', 'beauty_tools'],
  ['retail_goods.beauty_personal_care.beauty_tools|Mirrors, Face Tools & Skincare Devices', 'face_eye_tools'],
  ['retail_goods.beauty_personal_care.beauty_tools|Hair Tools, Dryers & Stylers', 'hair_tools_stylers'],
  ['retail_goods.beauty_personal_care.beauty_tools|Brushes, Applicators & Empty Containers', 'makeup_brushes_applicators'],
  ['retail_goods.beauty_personal_care.beauty_tools|Manicure & Pedicure Tools', 'manicure_pedicure'],
  ['retail_goods.beauty_personal_care|Hair Care & Wigs', 'hair_care'],
  ['retail_goods.beauty_personal_care.hair_care|Hair Colour', 'hair_color'],
  ['retail_goods.beauty_personal_care.hair_care|Hair Oils, Masks & Treatments', 'hair_treatments_oils'],
  ['retail_goods.beauty_personal_care.makeup|Eye & Brow Makeup', 'eye_makeup'],
  ['retail_goods.beauty_personal_care.oral_care|Teeth Whitening', 'whitening'],
  ['retail_goods.beauty_personal_care|Salon, Tattoo & Body Art', 'salon_body_art'],
  ['retail_goods.beauty_personal_care.salon_body_art|Tattoo & PMU Supplies', 'tattoo_pmu'],
  ['retail_goods.beauty_personal_care.salon_body_art|Temporary Tattoos & Mehndi', 'temporary_body_art'],
  ["retail_goods.beauty_personal_care|Shaving, Hair Removal & Men's Grooming", 'shaving_grooming'],
  ["retail_goods.beauty_personal_care.shaving_grooming|Beard & Men's Grooming", 'beard_care'],
  ['retail_goods.beauty_personal_care.skincare|Cleansers, Toners & Exfoliators', 'cleansers_toners'],
  ['retail_goods.beauty_personal_care.skincare|Moisturizers, Eye & Lip Care', 'moisturizers_eye_lip'],
  ['retail_goods.beauty_personal_care.skincare|Sun Care & Self-Tan', 'sun_care'],
  ['retail_goods.crafts_stationery_books_music|Arts & Crafts Supplies', 'arts_crafts'],
  ['retail_goods.crafts_stationery_books_music.arts_crafts|Soap, Candle & Cosmetic Making', 'diy_making_supplies'],
  ['retail_goods.crafts_stationery_books_music.arts_crafts|Sewing, Knitting & Fabric', 'sewing_knitting'],
  ['retail_goods.crafts_stationery_books_music|Books & Physical Media', 'books_media'],
  ['retail_goods.crafts_stationery_books_music.books_media|DVDs & Blu-rays', 'movies_dvds'],
  ['retail_goods.crafts_stationery_books_music.books_media|Vinyl, CDs & Cassettes', 'music_records_cds'],
  ['retail_goods.crafts_stationery_books_music.musical_instruments|Guitars & String Instruments', 'guitars_strings'],
  ['retail_goods.crafts_stationery_books_music.musical_instruments|Wind & Brass Instruments', 'wind_brass'],
  ['retail_goods.crafts_stationery_books_music|Stationery & Office Supplies', 'stationery_office'],
  ['retail_goods.crafts_stationery_books_music.stationery_office|Greeting Cards & Invitations', 'cards_invitations'],
  ['retail_goods.crafts_stationery_books_music.stationery_office|Notebooks, Planners & Paper', 'paper_notebooks'],
  ['retail_goods.crafts_stationery_books_music.stationery_office|Pens, Pencils & Markers', 'writing_instruments'],
  ['retail_goods.electronics_appliances.audio|Home Audio & Hi-Fi', 'home_audio_hifi'],
  ['retail_goods.electronics_appliances.audio|Speakers & Smart Speakers', 'speakers'],
  ['retail_goods.electronics_appliances|Cameras, Drones & Optics', 'cameras_optics'],
  ['retail_goods.electronics_appliances.cameras_optics|Cameras & Camcorders', 'cameras'],
  ['retail_goods.electronics_appliances.cameras_optics|Binoculars & Telescopes', 'optics'],
  ['retail_goods.electronics_appliances.cameras_optics|Lenses & Photo/Video Accessories', 'photo_video_accessories'],
  ['retail_goods.electronics_appliances.climate_water_heating|Space Heaters & Electric Blankets', 'space_heaters'],
  ['retail_goods.electronics_appliances|Computers & Networking', 'computers'],
  ['retail_goods.electronics_appliances.computers|Desktops & Mini PCs', 'desktops'],
  ['retail_goods.electronics_appliances.computers|Keyboards, Mice & Peripherals', 'peripherals'],
  ['retail_goods.electronics_appliances.computers|External Storage & Memory Cards', 'storage_memory'],
  ['retail_goods.electronics_appliances|Video Games & Consoles', 'gaming'],
  ['retail_goods.electronics_appliances.gaming|Game Consoles', 'consoles'],
  ['retail_goods.electronics_appliances.gaming|Physical Video Games', 'physical_games'],
  ['retail_goods.electronics_appliances.kitchen_appliances|Coffee & Beverage Makers', 'coffee_beverage'],
  ['retail_goods.electronics_appliances.kitchen_appliances|Electric Cooking Appliances', 'cooking_appliances'],
  ['retail_goods.electronics_appliances.kitchen_appliances|Blenders & Food Prep', 'food_prep_appliances'],
  ['retail_goods.electronics_appliances.kitchen_appliances|Stoves, Cooktops, Ovens & Hoods', 'stoves_cooktops_hoods'],
  ['retail_goods.electronics_appliances.laundry_cleaning_appliances|Irons & Garment Steamers', 'irons_garment_care'],
  ['retail_goods.electronics_appliances|Phones, Tablets & Mobile Accessories', 'phones_tablets'],
  ['retail_goods.electronics_appliances.phones_tablets|Feature Phones, Landlines & Two-Way Radios', 'basic_phones_radios'],
  ['retail_goods.electronics_appliances.phones_tablets|Mobile Gadgets & Holders', 'mobile_gadgets'],
  ['retail_goods.electronics_appliances.phones_tablets|Tablets & E-readers', 'tablets_ereaders'],
  ['retail_goods.electronics_appliances|Chargers, Cables & Power', 'power_charging'],
  ['retail_goods.electronics_appliances|Printers & Printer Supplies', 'printing'],
  ['retail_goods.electronics_appliances.printing|Printers, Scanners & 3D Printers', 'printers_scanners'],
  ['retail_goods.electronics_appliances.smart_home_security|Security Cameras & Video Doorbells', 'security_cameras_doorbells'],
  ['retail_goods.electronics_appliances.smart_home_security|Smart Hubs, Plugs & Controls', 'smart_hubs_controls'],
  ['retail_goods.electronics_appliances.smart_home_security|Smart Locks, Alarms & Sensors', 'smart_locks_alarms'],
  ['retail_goods.electronics_appliances.tv_video|Streaming Devices & TV Accessories', 'streaming_tv_accessories'],
  ['retail_goods.electronics_appliances|Wearable Tech', 'wearables'],
  ['retail_goods.electronics_appliances.wearables|Item & GPS Trackers', 'trackers'],
  ['retail_goods|Clothing & Apparel', 'fashion_apparel'],
  ['retail_goods.fashion_apparel.activewear|Activewear Tops & Jackets', 'activewear_tops'],
  ['retail_goods.fashion_apparel.activewear|Dance, Gymnastics & Martial Arts Wear', 'dance_martial_arts_wear'],
  ['retail_goods.fashion_apparel.activewear|Tracksuits & Workout Sets', 'tracksuits_sets'],
  ['retail_goods.fashion_apparel.baby_clothing|Baby Socks, Swim & Diaper Covers', 'baby_basics'],
  ['retail_goods.fashion_apparel.baby_clothing|Bodysuits & Rompers', 'baby_bodysuits'],
  ['retail_goods.fashion_apparel.baby_clothing|Baby Sleepwear & Sleep Sacks', 'baby_sleepwear'],
  ['retail_goods.fashion_apparel.costumes_cosplay|Cosplay & Character Costumes', 'cosplay_character'],
  ['retail_goods.fashion_apparel.costumes_cosplay|Halloween & Party Costumes', 'party_costumes'],
  ['retail_goods.fashion_apparel|Jumpsuits, Rompers & Overalls', 'jumpsuits_rompers'],
  ["retail_goods.fashion_apparel.kids_clothing|Kids' Activewear & Swimwear", 'kids_activewear_swim'],
  ["retail_goods.fashion_apparel.kids_clothing|Kids' Traditional Wear", 'kids_traditional'],
  ['retail_goods.fashion_apparel|Skirts & Skorts', 'skirts'],
  ['retail_goods.fashion_apparel.sleepwear_loungewear|Nightgowns & Sleep Shirts', 'nightgowns'],
  ['retail_goods.fashion_apparel|Traditional & Ceremonial Clothing', 'traditional_ceremonial'],
  ['retail_goods.fashion_apparel.traditional_ceremonial|Kurtas, Salwar & Sherwanis', 'kurtas_salwar'],
  ['retail_goods.fashion_apparel.traditional_ceremonial|Modest & Islamic Wear', 'modest_islamic'],
  ['retail_goods.fashion_apparel.traditional_ceremonial|Other Regional & Ceremonial', 'regional_ceremonial'],
  ['retail_goods.fashion_apparel.underwear_socks|Shapewear, Thermals & Undershirts', 'shapewear_thermals'],
  ['retail_goods.fashion_apparel.uniforms_workwear|Medical Scrubs & Lab Coats', 'medical_scrubs'],
  ['retail_goods.fashion_apparel.uniforms_workwear|Work & Service Uniforms', 'work_uniforms'],
  ['retail_goods|Food, Grocery & Drinks', 'food_grocery_gourmet'],
  ['retail_goods.food_grocery_gourmet.alcohol|Ready-to-Drink Cocktails & Seltzers', 'rtd_cocktails'],
  ['retail_goods.food_grocery_gourmet.beverages|Malted, Chocolate & Nutrition Drinks', 'health_nutrition_drinks'],
  ['retail_goods.food_grocery_gourmet.beverages|Milk & Plant Milk', 'milk'],
  ['retail_goods.food_grocery_gourmet.cooking_essentials|Cooking Oils & Ghee', 'oils_ghee'],
  ['retail_goods.food_grocery_gourmet.cooking_essentials|Sauces, Pickles & Dips', 'sauces_condiments'],
  ['retail_goods.food_grocery_gourmet|Food Gift Hampers', 'gift_hampers'],
  ['retail_goods.food_grocery_gourmet|Meal Kits & Prepared-Meal Plans', 'meal_kits'],
  ['retail_goods.food_grocery_gourmet|Noodles, Ready Meals & Breakfast', 'packaged_foods'],
  ['retail_goods.food_grocery_gourmet.packaged_foods|Breakfast Cereals & Spreads', 'breakfast_spreads'],
  ['retail_goods.food_grocery_gourmet.packaged_foods|Ready Meals & Instant Soups', 'ready_meals'],
  ['retail_goods.food_grocery_gourmet.produce_meat_dairy_bakery|Bread & Bakery', 'bakery'],
  ['retail_goods.food_grocery_gourmet.produce_meat_dairy_bakery|Cheese, Yogurt & Butter', 'dairy_cheese'],
  ['retail_goods.food_grocery_gourmet.produce_meat_dairy_bakery|Meat, Seafood, Eggs & Tofu', 'meat_seafood_eggs'],
  ['retail_goods.food_grocery_gourmet.snacks_sweets|Biscuits, Cookies & Crackers', 'biscuits_cookies'],
  ['retail_goods.food_grocery_gourmet.snacks_sweets|Nuts, Seeds & Dried Fruit', 'nuts_dried_fruit'],
  ['retail_goods.food_grocery_gourmet.snacks_sweets|Chips & Savoury Snacks', 'savory_snacks'],
  ['retail_goods.food_grocery_gourmet.snacks_sweets|Protein, Granola & Energy Bars', 'snack_bars'],
  ['retail_goods.food_grocery_gourmet.snacks_sweets|Chocolate, Candy & Indian Sweets', 'sweets_confectionery'],
  ['retail_goods|Gift Cards & Prepaid Cards', 'gift_cards_prepaid'],
  ['retail_goods.gift_cards_prepaid|Gaming, Streaming & Digital Content Cards', 'digital_entertainment_cards'],
  ['retail_goods.gift_cards_prepaid|Prepaid & Multi-Brand Cards', 'open_loop_multibrand'],
  ['retail_goods.gift_cards_prepaid|Shopping & Retail Cards', 'shopping_cards'],
  ['retail_goods.gift_cards_prepaid|Travel, Dining & Mobility Cards', 'travel_dining_cards'],
  ['retail_goods.health_wellness_products|First Aid & Medical Supplies', 'first_aid_supplies'],
  ['retail_goods.health_wellness_products.first_aid_supplies|Medical Consumables & Incontinence', 'medical_consumables'],
  ['retail_goods.health_wellness_products|Health Monitors & Therapy Devices', 'health_devices'],
  ['retail_goods.health_wellness_products.health_devices|Massage & Pain-Relief Devices', 'massage_therapy'],
  ['retail_goods.health_wellness_products|Medicines & Treatments', 'medicines'],
  ['retail_goods.health_wellness_products.medicines|Digestive & Urinary Health', 'digestive_urinary'],
  ['retail_goods.health_wellness_products.medicines|Ayurvedic, Homeopathic & Traditional Medicines', 'traditional_homeopathic'],
  ['retail_goods.health_wellness_products|Mobility, Supports & Daily Living', 'mobility_rehab'],
  ['retail_goods.health_wellness_products.mobility_rehab|Braces, Supports & Orthotics', 'braces_supports'],
  ['retail_goods.health_wellness_products|Vitamins, Supplements & Sports Nutrition', 'supplements_nutrition'],
  ['retail_goods.health_wellness_products.supplements_nutrition|Herbal & Ayurvedic Supplements', 'herbal_ayurvedic'],
  ['retail_goods.health_wellness_products.supplements_nutrition|Protein Powders & Gainers', 'protein'],
  ['retail_goods.health_wellness_products.vision_hearing|Eye, Lens & Ear Care', 'eye_ear_care'],
  ['retail_goods.health_wellness_products.vision_hearing|Hearing Aids & Amplifiers', 'hearing_aids'],
  ['retail_goods.health_wellness_products.vision_hearing|Prescription Glasses & Readers', 'prescription_eyewear'],
  ['retail_goods|Home, Kitchen & Garden', 'home_decor_kitchen_garden'],
  ['retail_goods.home_decor_kitchen_garden.furniture|Cabinets, Wardrobes & Shelving', 'cabinets_shelving'],
  ['retail_goods.home_decor_kitchen_garden.furniture|Sofas, Chairs & Seating', 'seating'],
  ['retail_goods.home_decor_kitchen_garden|Garden & Outdoor Living', 'garden_outdoor'],
  ['retail_goods.home_decor_kitchen_garden.garden_outdoor|Patio & Outdoor Living', 'outdoor_living'],
  ['retail_goods.home_decor_kitchen_garden.home_decor|Seasonal, Festive & Religious Decor', 'seasonal_religious'],
  ['retail_goods.home_decor_kitchen_garden.home_decor|Wall Art, Mirrors & Clocks', 'wall_decor'],
  ['retail_goods.home_decor_kitchen_garden.home_textiles|Cushions & Covers', 'cushions_throws_covers'],
  ['retail_goods.home_decor_kitchen_garden.household_essentials|Fire Safety, Safes & Emergency', 'fire_safety_emergency'],
  ['retail_goods.home_decor_kitchen_garden.household_essentials|Paper, Waste & Disposables', 'paper_disposables'],
  ['retail_goods.home_decor_kitchen_garden.kitchen_dining|Food Storage & Lunch Boxes', 'food_storage_lunch'],
  ['retail_goods.home_decor_kitchen_garden.kitchen_dining|Kitchen Tools & Utensils', 'kitchen_tools'],
  ['retail_goods.home_decor_kitchen_garden.lighting|Flashlights, Headlamps & Lanterns', 'portable_lights'],
  ['retail_goods.home_decor_kitchen_garden|Party, Gift Wrap & Awards', 'party_gifts'],
  ['retail_goods.home_decor_kitchen_garden.party_gifts|Gift Wrap & Gift Bags', 'gift_wrap'],
  ['retail_goods.home_decor_kitchen_garden|Storage & Bathroom Accessories', 'storage_bathroom'],
  ['retail_goods.jewelry_watches_accessories.clothing_accessories|Gloves, Mittens & Arm Sleeves', 'gloves'],
  ['retail_goods.jewelry_watches_accessories.eyewear|Plano & Blue-Light Glasses', 'plano_frames'],
  ['retail_goods.jewelry_watches_accessories|Headwear & Hair Accessories', 'headwear_hair'],
  ['retail_goods.jewelry_watches_accessories.headwear_hair|Hijabs, Headscarves & Veils', 'hijabs_headscarves'],
  ['retail_goods.pet_supplies|Aquariums, Terrariums & Cages', 'habitats_aquariums'],
  ['retail_goods.pet_supplies.habitats_aquariums|Aquariums & Fish Supplies', 'aquarium_fish'],
  ['retail_goods.pet_supplies.habitats_aquariums|Bird & Small-Animal Cages', 'bird_small_animal'],
  ['retail_goods.pet_supplies.pet_food_treats|Fish, Bird, Small Animal & Livestock Food', 'other_animal_food'],
  ['retail_goods.pet_supplies|Pet Gear & Accessories', 'pet_gear'],
  ['retail_goods.pet_supplies.pet_gear|Bowls, Feeders & Fountains', 'bowls_feeders'],
  ['retail_goods.pet_supplies.pet_gear|Collars, Leashes & Harnesses', 'collars_leashes'],
  ['retail_goods.pet_supplies.pet_gear|Crates, Carriers & Travel', 'crates_carriers'],
  ['retail_goods.pet_supplies.pet_gear|Pet Beds, Cat Trees & Furniture', 'pet_beds_furniture'],
  ['retail_goods.pet_supplies.pet_health_grooming|Health & Supplements', 'pet_health'],
  ['retail_goods.shoes_bags_luggage.bags_wallets|Handbags & Totes', 'handbags'],
  ['retail_goods.shoes_bags_luggage.bags_wallets|Pouches & Bag Organizers', 'pouches_organizers'],
  ['retail_goods.shoes_bags_luggage|Luggage & Travel Gear', 'luggage_travel'],
  ['retail_goods.shoes_bags_luggage.shoes|Flats, Loafers & Dress Shoes', 'flats_dress_shoes'],
  ["retail_goods.shoes_bags_luggage.shoes|Kids' & Baby Shoes", 'kids_shoes'],
  ['retail_goods.shoes_bags_luggage.shoes|Sandals, Slides & Slippers', 'sandals_slippers'],
  ['retail_goods.shoes_bags_luggage.shoes|Shoe Care & Accessories', 'shoe_care'],
  ['retail_goods.shoes_bags_luggage.shoes|Sneakers & Athletic Shoes', 'sneakers'],
  ['retail_goods.sports_fitness_outdoors|Camping, Hiking & Climbing', 'camping_hiking'],
  ['retail_goods.sports_fitness_outdoors.camping_hiking|Hiking & Climbing Gear', 'hiking_climbing'],
  ['retail_goods.sports_fitness_outdoors.camping_hiking|Tactical & Survival Gear', 'tactical_survival'],
  ['retail_goods.sports_fitness_outdoors.cycling|Helmets & Protective Pads', 'bike_helmets_protection'],
  ['retail_goods.sports_fitness_outdoors.cycling|Bike Parts & Components', 'bike_parts'],
  ['retail_goods.sports_fitness_outdoors|Golf, Combat & Individual Sports', 'individual_sports'],
  ['retail_goods.sports_fitness_outdoors.individual_sports|Track, Gymnastics & Dance Gear', 'track_gymnastics_dance'],
  ['retail_goods.sports_fitness_outdoors|Game Room & Backyard Games', 'recreational_games'],
  ['retail_goods.sports_fitness_outdoors.recreational_games|Foosball, Air Hockey & Bowling', 'game_tables'],
  ['retail_goods.sports_fitness_outdoors.recreational_games|Lawn, Beach & Flying-Disc Games', 'lawn_beach_games'],
  ['retail_goods.sports_fitness_outdoors.skates_scooters_e_mobility|E-Scooters & Self-Balancing', 'e_scooters_boards'],
  ['retail_goods.sports_fitness_outdoors.skates_scooters_e_mobility|Skateboards, Skates & Kick Scooters', 'skates_kick_scooters'],
  ['retail_goods.sports_fitness_outdoors.team_sports|Coaching & Training Gear', 'team_training_gear'],
  ['retail_goods.sports_fitness_outdoors.water_sports|Surf, Paddle & Board Sports', 'surf_paddle'],
  ['retail_goods.sports_fitness_outdoors.winter_sports|Skiing & Snowboarding', 'ski_snowboard'],
  ['retail_goods.sports_fitness_outdoors.winter_sports|Sleds, Ice Skates & Snowshoes', 'sleds_ice_skates'],
  ['retail_goods.tobacco_vape_cannabis|Cannabis & Psychoactive Botanicals', 'cannabis'],
  ['retail_goods.tobacco_vape_cannabis|Vapes & Heated Tobacco', 'vaping_heated'],
  ['retail_goods.tools_home_improvement_industrial|Building Materials & Paint', 'building_materials'],
  ['retail_goods.tools_home_improvement_industrial.building_materials|Adhesives, Sealants & Tape', 'adhesives_sealants'],
  ['retail_goods.tools_home_improvement_industrial.building_materials|Paint & Painting Supplies', 'paint_coatings'],
  ['retail_goods.tools_home_improvement_industrial.building_materials|Lumber & Structural Materials', 'structural_materials'],
  ['retail_goods.tools_home_improvement_industrial|Electrical & Components', 'electrical'],
  ['retail_goods.tools_home_improvement_industrial.electrical|Power, Generators & Solar Kits', 'power_generators_solar'],
  ['retail_goods.tools_home_improvement_industrial|Hardware & Locks', 'hardware'],
  ['retail_goods.tools_home_improvement_industrial.hardware|Mechanical Locks & Keys', 'locks_keys'],
  ['retail_goods.tools_home_improvement_industrial|Industrial, Lab & MRO', 'industrial_lab'],
  ['retail_goods.tools_home_improvement_industrial.industrial_lab|Industrial Parts & Machinery', 'industrial_parts'],
  ['retail_goods.tools_home_improvement_industrial|Packaging & Shipping Supplies', 'packaging_shipping'],
  ['retail_goods.tools_home_improvement_industrial|Plumbing, Bathroom Fixtures & HVAC', 'plumbing_hvac'],
  ['retail_goods.tools_home_improvement_industrial.plumbing_hvac|Pipes, Fittings & Repair', 'pipes_fittings'],
  ['retail_goods.tools_home_improvement_industrial.safety_ppe|Personal Protective Equipment', 'ppe'],
  ['retail_goods.tools_home_improvement_industrial.safety_ppe|Safety Signs & Barriers', 'signage_barriers'],
  ['retail_goods.toys_games_collectibles.collectibles|Coins, Stamps & Memorabilia', 'coins_memorabilia'],
  ['retail_goods.toys_games_collectibles.collectibles|Collectible Figures & Blind Boxes', 'figures_blind_boxes'],
  ['retail_goods.toys_games_collectibles.collectibles|Model Kits & Scale Models', 'model_kits'],
  ['retail_goods.toys_games_collectibles.collectibles|Display Replica Weapons', 'replica_weapons'],
  ['retail_goods.toys_games_collectibles.games_puzzles|Board Games', 'board_tabletop_games'],
  ['retail_goods.toys_games_collectibles.games_puzzles|Handheld Electronic Games', 'electronic_games'],
  ["retail_goods.toys_games_collectibles.toys|Kids' Arts & Craft Kits", 'arts_crafts_kits'],
  ['retail_goods.toys_games_collectibles.toys|Building & Construction Toys', 'building_toys'],
  ['retail_goods.toys_games_collectibles.toys|Educational & STEM Toys', 'educational_stem'],
  ['retail_goods.toys_games_collectibles.toys|Novelty, Fidget & Magic Toys', 'novelty_fidget'],
  ['retail_goods.toys_games_collectibles.toys|Outdoor, Active & Ride-On Toys', 'outdoor_ride_on'],
  ['retail_goods.toys_games_collectibles.toys|Vehicles, RC, Robots & Flying Toys', 'vehicles_rc'],
  ['travel_hospitality|Attractions, Tours & Experiences', 'attractions_tours'],
  ['travel_hospitality|Cruises & Holiday Packages', 'cruises_vacation_packages'],
  ['travel_hospitality.cruises_vacation_packages|Package Holidays & Tours', 'package_holidays'],
  ['travel_hospitality|Flights', 'flights_aviation'],
  ['travel_hospitality.flights_aviation|Airline Extras & Miles', 'airline_extras_loyalty'],
  ['travel_hospitality|Hotels & Accommodation', 'hotels_accommodations'],
  ['travel_hospitality.hotels_accommodations|Hostels, Guesthouses & Homestays', 'hostels_guesthouses'],
  ['travel_hospitality.hotels_accommodations|Hotel Points & Memberships', 'hotel_loyalty_points'],
  ['travel_hospitality|Intercity Transport & Self-Drive Rental', 'transport_mobility'],
  ['travel_hospitality.transport_mobility|Car & Van Rental', 'car_rental'],
  ['travel_hospitality.transport_mobility|Transfers & Private Drivers', 'transfers'],
  ['travel_hospitality.travel_services|Airport & Luggage Services', 'airport_services'],
  ['travel_hospitality.travel_services|Flight Delay & Compensation Claims', 'flight_claims'],
  ['travel_hospitality.travel_services|Travel Insurance & Delay Claims', 'insurance_claims'],
  ['travel_hospitality.travel_services|Trip Planning & Travel Deals', 'planning_deals'],
  ['travel_hospitality.travel_services|Visas & Travel Documents', 'visas_documents'],
]);

export function taxonomySlug(value) {
  return value
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .split('_')
    .filter((part) => part && part !== 'and')
    .join('_');
}

export function deriveAonTaxonomyNodeId({ name, parentId = null, level = 1 }) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('taxonomy node must have a non-empty name');
  }
  const overrideKey = parentId ? `${parentId}|${name}` : '';
  const ownSlug = level === 1
    ? levelOneOverrides.get(name) ?? taxonomySlug(name)
    : childSlugOverrides.get(overrideKey) ?? taxonomySlug(name);
  return parentId ? `${parentId}.${ownSlug}` : ownSlug;
}

export function flattenAonTaxonomyV1(nodes, parentId = null, level = 1, entries = []) {
  for (const node of nodes) {
    if (!node || typeof node.name !== 'string' || node.name.trim() === '') {
      throw new Error('taxonomy node must have a non-empty name');
    }
    if (node.children !== undefined && !Array.isArray(node.children)) {
      throw new Error(`taxonomy node children must be an array: ${node.name}`);
    }
    const categoryId = deriveAonTaxonomyNodeId({
      name: node.name,
      parentId,
      level,
    });
    if (entries.some((entry) => entry.category_id === categoryId)) {
      throw new Error(`duplicate generated category id: ${categoryId}`);
    }
    entries.push(Object.freeze({
      category_id: categoryId,
      name: node.name,
      slug: categoryId.split('.').at(-1),
      parent_id: parentId,
      level,
    }));
    flattenAonTaxonomyV1(node.children ?? [], categoryId, level + 1, entries);
  }
  return entries;
}

function relation(leftId, rightId) {
  if (leftId === rightId) return 'equal';
  if (rightId.startsWith(`${leftId}.`)) return 'ancestor';
  if (leftId.startsWith(`${rightId}.`)) return 'descendant';
  return 'disjoint';
}

export function createAonTaxonomyV1Resolver(taxonomy) {
  if (!Array.isArray(taxonomy)) throw new Error('AON Taxonomy v1 root must be an array');
  const entries = Object.freeze(flattenAonTaxonomyV1(taxonomy));
  const byId = new Map(entries.map((entry) => [entry.category_id, entry]));
  const ids = new Set(byId.keys());
  return Object.freeze({
    sourceId: 'aon-taxonomy-v1',
    size: ids.size,
    entries,
    has(id) {
      return typeof id === 'string' && ids.has(id);
    },
    get(id) {
      return byId.get(id) ?? null;
    },
    relation(leftId, rightId) {
      if (!ids.has(leftId) || !ids.has(rightId)) return 'unknown';
      return relation(leftId, rightId);
    },
    descendants(id, { includeSelf = true } = {}) {
      if (!ids.has(id)) return Object.freeze([]);
      return Object.freeze(entries
        .filter((entry) => entry.category_id === id || entry.category_id.startsWith(`${id}.`))
        .filter((entry) => includeSelf || entry.category_id !== id));
    },
  });
}

export function projectAonTaxonomyV1Metadata(taxonomy, metadata) {
  const resolver = createAonTaxonomyV1Resolver(taxonomy);
  if (!metadata || typeof metadata !== 'object' || !Array.isArray(metadata.records)) {
    throw new Error('AON Taxonomy v1 metadata must contain records');
  }
  const sourceById = new Map();
  for (const record of metadata.records) {
    if (!record || typeof record.category_id !== 'string' || sourceById.has(record.category_id)) {
      throw new Error('AON Taxonomy v1 metadata contains an invalid or duplicate category_id');
    }
    sourceById.set(record.category_id, record);
  }
  const records = resolver.entries.map((entry) => {
    const record = sourceById.get(entry.category_id);
    if (!record || record.name !== entry.name) {
      throw new Error(`AON Taxonomy v1 metadata is missing or stale: ${entry.category_id}`);
    }
    return Object.freeze(record);
  });
  const projection = {
    schema_version: metadata.schema_version,
    taxonomy_version: metadata.taxonomy_version,
    baseline_digest: metadata.baseline_digest,
    source_metadata_digest: metadata.metadata_digest,
    record_count: records.length,
    records: Object.freeze(records),
  };
  const canonical = (value) => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  };
  projection.metadata_digest = createHash('sha256').update(canonical(projection)).digest('hex');
  return Object.freeze(projection);
}

export function loadAonTaxonomyV1Resolver() {
  return createAonTaxonomyV1Resolver(JSON.parse(readFileSync(taxonomyPath, 'utf8')));
}

export const aonTaxonomyV1Resolver = loadAonTaxonomyV1Resolver();
