/**
 * AgentOffer Category Attributes v0.1
 *
 * Type-specific attribute definitions for each category.type.
 * All types use sub_type discrimination to support industry-specific
 * attribute schemas within the same top-level category.
 *
 * Within each type, fields are marked:
 *   - (required) — must be present with a valid value
 *   - (optional) — may be omitted
 *
 * @see https://agentoffernetwork.org/schema/offer/v0.1
 */

// ─── Type Enum ──────────────────────────────────────────────────────────────

export type CategoryType =
  | 'software_saas'
  | 'travel_hospitality'
  | 'education'
  | 'financial_service'
  | 'electronics'
  | 'entertainment';

// ─── Sub-Type Enums ─────────────────────────────────────────────────────────

export type SoftwareSaasSubType =
  | 'project_management'
  | 'design'
  | 'development_tools'
  | 'crm'
  | 'analytics'
  | 'communication'
  | 'security'
  | 'ai_tools';

export type TravelHospitalitySubType =
  | 'hotel'
  | 'flight'
  | 'car_rental'
  | 'vacation_package'
  | 'restaurant'
  | 'attraction';

export type EducationSubType =
  | 'online_course'
  | 'certification'
  | 'bootcamp'
  | 'language_learning'
  | 'tutoring'
  | 'academic_program';

export type FinancialServiceSubType =
  | 'credit_card'
  | 'insurance'
  | 'loan'
  | 'investment'
  | 'banking'
  | 'payment';

export type ElectronicsSubType =
  | 'smartphone'
  | 'laptop'
  | 'audio'
  | 'wearable'
  | 'gaming_hardware'
  | 'smart_home'
  | 'camera';

export type EntertainmentSubType =
  | 'game'
  | 'streaming_video'
  | 'ai_companion'
  | 'social_audio'
  | 'sports_betting'
  | 'music_audio'
  | 'live_streaming';


// ═══════════════════════════════════════════════════════════════════════════
// 1. software_saas
// ═══════════════════════════════════════════════════════════════════════════

/** Fields shared by all software_saas sub_types. */
interface SoftwareSaasCommon {
  /** (required) Software sub-category discriminator. */
  sub_type: SoftwareSaasSubType;
  /** (required) Subscription or pricing model. */
  plan_type: 'free_trial' | 'freemium' | 'paid' | 'open_source';
  /** (required) Supported platforms. */
  platform: ('web' | 'desktop' | 'mobile' | 'api')[];
  /** (optional) Free trial duration in days. */
  trial_days?: number;
  /** (optional) Key feature highlights. */
  features?: string[];
  /** (optional) Third-party integrations supported. */
  integrations?: string[];
  /** (optional) Number of seats included in the plan. */
  seats_included?: number;
  /** (optional) Deployment model. */
  deployment?: 'cloud' | 'on_premise' | 'hybrid';
}

// ── 1.1 project_management ──────────────────────────────────────────────────

export interface ProjectManagementAttributes extends SoftwareSaasCommon {
  sub_type: 'project_management';
  /** (optional) Supported methodologies. */
  methodologies?: ('kanban' | 'scrum' | 'waterfall' | 'gantt')[];
  /** (optional) Maximum projects or boards allowed. */
  max_projects?: number;
  /** (optional) Whether time tracking is included. */
  time_tracking?: boolean;
}

// ── 1.2 design ──────────────────────────────────────────────────────────────

export interface DesignToolAttributes extends SoftwareSaasCommon {
  sub_type: 'design';
  /** (optional) Design tool category. */
  design_type?: 'ui_ux' | 'graphic' | 'video' | '3d' | 'whiteboard';
  /** (optional) Export formats supported. */
  export_formats?: string[];
  /** (optional) Whether real-time collaboration is supported. */
  real_time_collab?: boolean;
}

// ── 1.3 development_tools ───────────────────────────────────────────────────

export interface DevelopmentToolsAttributes extends SoftwareSaasCommon {
  sub_type: 'development_tools';
  /** (optional) Tool category. */
  dev_category?: 'ide' | 'ci_cd' | 'hosting' | 'monitoring' | 'database' | 'testing';
  /** (optional) Supported programming languages. */
  supported_languages?: string[];
  /** (optional) Whether open-source or self-hosted option exists. */
  self_hosted?: boolean;
}

// ── 1.4 crm ────────────────────────────────────────────────────────────────

export interface CrmAttributes extends SoftwareSaasCommon {
  sub_type: 'crm';
  /** (optional) Maximum contacts or leads allowed. */
  max_contacts?: number;
  /** (optional) Whether email automation is included. */
  email_automation?: boolean;
  /** (optional) Whether sales pipeline is included. */
  sales_pipeline?: boolean;
}

// ── 1.5 analytics ──────────────────────────────────────────────────────────

export interface AnalyticsAttributes extends SoftwareSaasCommon {
  sub_type: 'analytics';
  /** (optional) Analytics focus area. */
  analytics_type?: 'web' | 'product' | 'marketing' | 'business_intelligence';
  /** (optional) Data retention period. */
  data_retention?: string;
  /** (optional) Whether real-time dashboards are available. */
  real_time?: boolean;
}

// ── 1.6 communication ──────────────────────────────────────────────────────

export interface CommunicationAttributes extends SoftwareSaasCommon {
  sub_type: 'communication';
  /** (optional) Communication channels supported. */
  channels?: ('chat' | 'video' | 'voice' | 'email' | 'forum')[];
  /** (optional) Maximum participants in a call or meeting. */
  max_participants?: number;
  /** (optional) Whether screen sharing is supported. */
  screen_sharing?: boolean;
}

// ── 1.7 security ───────────────────────────────────────────────────────────

export interface SecurityAttributes extends SoftwareSaasCommon {
  sub_type: 'security';
  /** (optional) Security focus area. */
  security_type?: 'endpoint' | 'network' | 'identity' | 'encryption' | 'compliance';
  /** (optional) Compliance certifications held. */
  certifications?: string[];
  /** (optional) Whether SOC 2 compliant. */
  soc2_compliant?: boolean;
}

// ── 1.8 ai_tools ───────────────────────────────────────────────────────────

export interface AiToolsAttributes extends SoftwareSaasCommon {
  sub_type: 'ai_tools';
  /** (optional) AI capability category. */
  ai_category?: 'text_generation' | 'image_generation' | 'code_assistant' | 'data_analysis' | 'automation';
  /** (optional) Underlying model or engine. */
  model_provider?: string;
  /** (optional) API rate limits description. */
  rate_limits?: string;
}

export type SoftwareSaasAttributes =
  | ProjectManagementAttributes
  | DesignToolAttributes
  | DevelopmentToolsAttributes
  | CrmAttributes
  | AnalyticsAttributes
  | CommunicationAttributes
  | SecurityAttributes
  | AiToolsAttributes;

// ═══════════════════════════════════════════════════════════════════════════
// 2. travel_hospitality
// ═══════════════════════════════════════════════════════════════════════════

/** Fields shared by all travel_hospitality sub_types. */
interface TravelHospitalityCommon {
  /** (required) Travel sub-category discriminator. */
  sub_type: TravelHospitalitySubType;
  /** (required) Destination location. */
  destination: {
    city: string;
    country: string;
  };
  /** (optional) Cancellation policy summary. */
  cancellation_policy?: string;
}

// ── 2.1 hotel ──────────────────────────────────────────────────────────────

export interface HotelAttributes extends TravelHospitalityCommon {
  sub_type: 'hotel';
  /** (optional) Property classification. */
  property_type?: 'hotel' | 'resort' | 'hostel' | 'apartment' | 'villa' | 'homestay';
  /** (optional) Star or quality rating (1–5). */
  star_rating?: number;
  /** (optional) Available amenities. */
  amenities?: string[];
  /** (optional) Room or unit type. */
  room_type?: string;
  /** (optional) Check-in time. */
  check_in_time?: string;
  /** (optional) Check-out time. */
  check_out_time?: string;
  /** (optional) Whether breakfast is included. */
  breakfast_included?: boolean;
  /** (optional) Maximum guest count. */
  max_guests?: number;
}

// ── 2.2 flight ─────────────────────────────────────────────────────────────

export interface FlightAttributes extends TravelHospitalityCommon {
  sub_type: 'flight';
  /** (required) Airline name. */
  airline: string;
  /** (required) Route information. */
  route: {
    origin: string;
    destination: string;
  };
  /** (required) Cabin class. */
  cabin_class: 'economy' | 'premium_economy' | 'business' | 'first';
  /** (optional) Number of stops (0 = direct). */
  stops?: number;
  /** (optional) Whether baggage is included. */
  baggage_included?: boolean;
  /** (optional) Whether in-flight wifi is available. */
  in_flight_wifi?: boolean;
}

// ── 2.3 car_rental ─────────────────────────────────────────────────────────

export interface CarRentalAttributes extends TravelHospitalityCommon {
  sub_type: 'car_rental';
  /** (required) Vehicle category. */
  vehicle_type: 'economy' | 'compact' | 'midsize' | 'suv' | 'luxury' | 'van';
  /** (required) Pickup location. */
  pickup_location: string;
  /** (optional) Whether insurance is included. */
  insurance_included?: boolean;
  /** (optional) Mileage policy. */
  mileage_policy?: 'unlimited' | 'limited';
  /** (optional) Minimum driver age. */
  driver_age_min?: number;
}

// ── 2.4 vacation_package ───────────────────────────────────────────────────

export interface VacationPackageAttributes extends TravelHospitalityCommon {
  sub_type: 'vacation_package';
  /** (required) Duration in nights. */
  duration_nights: number;
  /** (required) Included components. */
  includes: ('flight' | 'hotel' | 'meals' | 'activities' | 'transfer')[];
  /** (optional) Maximum group size. */
  group_size?: number;
  /** (optional) Whether the package is all-inclusive. */
  all_inclusive?: boolean;
}

// ── 2.5 restaurant ─────────────────────────────────────────────────────────

export interface RestaurantAttributes extends TravelHospitalityCommon {
  sub_type: 'restaurant';
  /** (required) Cuisine type. */
  cuisine_type: string;
  /** (required) Price range indicator. */
  price_range: '$' | '$$' | '$$$' | '$$$$';
  /** (optional) Whether reservation is required. */
  reservation_required?: boolean;
  /** (optional) Michelin stars (0–3). */
  michelin_stars?: number;
  /** (optional) Dietary options available. */
  dietary_options?: string[];
}

// ── 2.6 attraction ─────────────────────────────────────────────────────────

export interface AttractionAttributes extends TravelHospitalityCommon {
  sub_type: 'attraction';
  /** (required) Attraction classification. */
  attraction_type: 'theme_park' | 'museum' | 'tour' | 'show' | 'sports_event';
  /** (optional) Duration description. */
  duration?: string;
  /** (optional) Age restriction. */
  age_restriction?: string;
  /** (optional) Indoor or outdoor. */
  indoor_outdoor?: 'indoor' | 'outdoor' | 'both';
}

export type TravelHospitalityAttributes =
  | HotelAttributes
  | FlightAttributes
  | CarRentalAttributes
  | VacationPackageAttributes
  | RestaurantAttributes
  | AttractionAttributes;

// ═══════════════════════════════════════════════════════════════════════════
// 3. education
// ═══════════════════════════════════════════════════════════════════════════

/** Fields shared by all education sub_types. */
interface EducationCommon {
  /** (required) Education sub-category discriminator. */
  sub_type: EducationSubType;
  /** (required) Subject or topic area. */
  subject: string;
  /** (required) Target learner level. */
  level: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  /** (optional) Language of instruction. */
  language?: string;
  /** (optional) Whether a certificate is awarded. */
  certification?: boolean;
}

// ── 3.1 online_course ──────────────────────────────────────────────────────

export interface OnlineCourseAttributes extends EducationCommon {
  sub_type: 'online_course';
  /** (required) Delivery format. */
  format: 'video' | 'interactive' | 'live' | 'self_paced';
  /** (optional) Course duration in hours. */
  duration_hours?: number;
  /** (optional) Instructor name. */
  instructor?: string;
  /** (optional) Enrollment deadline. */
  enrollment_deadline?: string;
}

// ── 3.2 certification ──────────────────────────────────────────────────────

export interface CertificationAttributes extends EducationCommon {
  sub_type: 'certification';
  /** (required) Issuing body or organization. */
  issuing_body: string;
  /** (optional) Certification validity in years. */
  validity_years?: number;
  /** (optional) Exam format. */
  exam_format?: 'online' | 'in_person' | 'proctored';
  /** (optional) Prerequisites description. */
  prerequisites?: string[];
}

// ── 3.3 bootcamp ───────────────────────────────────────────────────────────

export interface BootcampAttributes extends EducationCommon {
  sub_type: 'bootcamp';
  /** (required) Delivery format. */
  format: 'online' | 'in_person' | 'hybrid';
  /** (required) Duration in weeks. */
  duration_weeks: number;
  /** (optional) Technology stack covered. */
  tech_stack?: string[];
  /** (optional) Job placement rate percentage. */
  job_placement_rate?: number;
  /** (optional) Whether career services are included. */
  career_services?: boolean;
}

// ── 3.4 language_learning ──────────────────────────────────────────────────

export interface LanguageLearningAttributes extends EducationCommon {
  sub_type: 'language_learning';
  /** (required) Target language to learn. */
  target_language: string;
  /** (required) Learning format. */
  format: 'app' | 'live_tutor' | 'self_paced' | 'immersive';
  /** (optional) Native languages supported for instruction. */
  native_language_support?: string[];
  /** (optional) Whether speech recognition is used. */
  speech_recognition?: boolean;
}

// ── 3.5 tutoring ───────────────────────────────────────────────────────────

export interface TutoringAttributes extends EducationCommon {
  sub_type: 'tutoring';
  /** (required) Delivery format. */
  format: 'online' | 'in_person';
  /** (optional) Session duration in minutes. */
  session_duration_minutes?: number;
  /** (optional) Tutor qualification description. */
  tutor_qualification?: string;
  /** (optional) Maximum group size (1 = private). */
  group_size?: number;
}

// ── 3.6 academic_program ───────────────────────────────────────────────────

export interface AcademicProgramAttributes extends EducationCommon {
  sub_type: 'academic_program';
  /** (required) Institution name. */
  institution: string;
  /** (required) Degree type. */
  degree_type: 'bachelor' | 'master' | 'phd' | 'diploma' | 'associate';
  /** (required) Field of study. */
  field_of_study: string;
  /** (optional) Duration in years. */
  duration_years?: number;
  /** (optional) Delivery format. */
  format?: 'on_campus' | 'online' | 'hybrid';
  /** (optional) Accreditation body. */
  accreditation?: string;
}

export type EducationAttributes =
  | OnlineCourseAttributes
  | CertificationAttributes
  | BootcampAttributes
  | LanguageLearningAttributes
  | TutoringAttributes
  | AcademicProgramAttributes;

// ═══════════════════════════════════════════════════════════════════════════
// 4. financial_service
// ═══════════════════════════════════════════════════════════════════════════

/** Fields shared by all financial_service sub_types. */
interface FinancialServiceCommon {
  /** (required) Financial sub-category discriminator. */
  sub_type: FinancialServiceSubType;
  /** (required) Regulatory license or registration identifier. */
  provider_license: string;
}

// ── 4.1 credit_card ────────────────────────────────────────────────────────

export interface CreditCardAttributes extends FinancialServiceCommon {
  sub_type: 'credit_card';
  /** (required) Annual fee amount or description. */
  annual_fee: string;
  /** (required) Annual percentage rate range. */
  apr_range: string;
  /** (required) Rewards program type. */
  rewards_type: 'points' | 'cashback' | 'miles' | 'none';
  /** (optional) Sign-up bonus description. */
  sign_up_bonus?: string;
  /** (optional) Minimum credit score required. */
  min_credit_score?: number;
  /** (optional) Foreign transaction fee percentage. */
  foreign_transaction_fee?: string;
}

// ── 4.2 insurance ──────────────────────────────────────────────────────────

export interface InsuranceAttributes extends FinancialServiceCommon {
  sub_type: 'insurance';
  /** (required) Insurance product type. */
  insurance_type: 'life' | 'health' | 'auto' | 'home' | 'travel' | 'pet';
  /** (required) Premium payment frequency. */
  premium_frequency: 'monthly' | 'quarterly' | 'annually';
  /** (optional) Coverage amount description. */
  coverage_amount?: string;
  /** (optional) Deductible amount description. */
  deductible?: string;
  /** (optional) Coverage details summary. */
  coverage_details?: string[];
}

// ── 4.3 loan ───────────────────────────────────────────────────────────────

export interface LoanAttributes extends FinancialServiceCommon {
  sub_type: 'loan';
  /** (required) Loan product type. */
  loan_type: 'personal' | 'mortgage' | 'auto' | 'student' | 'business';
  /** (required) Interest rate range. */
  interest_rate_range: string;
  /** (required) Loan term in months. */
  term_months: number;
  /** (optional) Maximum loan amount. */
  max_amount?: string;
  /** (optional) Whether collateral is required. */
  collateral_required?: boolean;
}

// ── 4.4 investment ─────────────────────────────────────────────────────────

export interface InvestmentAttributes extends FinancialServiceCommon {
  sub_type: 'investment';
  /** (required) Investment product type. */
  investment_type: 'brokerage' | 'robo_advisor' | 'crypto' | 'fund';
  /** (optional) Minimum investment amount. */
  min_investment?: string;
  /** (optional) Management fee percentage. */
  management_fee?: string;
  /** (optional) Asset classes available. */
  asset_classes?: string[];
}

// ── 4.5 banking ────────────────────────────────────────────────────────────

export interface BankingAttributes extends FinancialServiceCommon {
  sub_type: 'banking';
  /** (required) Account type. */
  account_type: 'checking' | 'savings' | 'cd' | 'money_market';
  /** (optional) Monthly maintenance fee. */
  monthly_fee?: string;
  /** (optional) Annual percentage yield. */
  apy?: string;
  /** (optional) Minimum balance requirement. */
  min_balance?: string;
  /** (optional) Whether FDIC or equivalent insured. */
  deposit_insured?: boolean;
}

// ── 4.6 payment ────────────────────────────────────────────────────────────

export interface PaymentAttributes extends FinancialServiceCommon {
  sub_type: 'payment';
  /** (required) Payment service type. */
  payment_type: 'wallet' | 'processor' | 'transfer' | 'bnpl';
  /** (required) Supported currencies. */
  supported_currencies: string[];
  /** (optional) Transaction fee description. */
  transaction_fee?: string;
  /** (optional) Settlement time description. */
  settlement_time?: string;
}

export type FinancialServiceAttributes =
  | CreditCardAttributes
  | InsuranceAttributes
  | LoanAttributes
  | InvestmentAttributes
  | BankingAttributes
  | PaymentAttributes;

// ═══════════════════════════════════════════════════════════════════════════
// 5. electronics
// ═══════════════════════════════════════════════════════════════════════════

/** Fields shared by all electronics sub_types. */
interface ElectronicsCommon {
  /** (required) Electronics sub-category discriminator. */
  sub_type: ElectronicsSubType;
  /** (required) Manufacturer brand. */
  brand: string;
  /** (required) Product model name or number. */
  model: string;
  /** (required) Item condition. */
  condition: 'new' | 'refurbished' | 'used';
  /** (optional) Warranty duration in months. */
  warranty_months?: number;
  /** (optional) Color or finish. */
  color?: string;
}

// ── 5.1 smartphone ─────────────────────────────────────────────────────────

export interface SmartphoneAttributes extends ElectronicsCommon {
  sub_type: 'smartphone';
  /** (required) Storage capacity in GB. */
  storage_gb: number;
  /** (optional) Screen size in inches. */
  screen_size_inches?: number;
  /** (optional) Connectivity standard. */
  connectivity?: '5g' | '4g';
  /** (optional) Operating system. */
  os?: 'ios' | 'android' | 'other';
}

// ── 5.2 laptop ─────────────────────────────────────────────────────────────

export interface LaptopAttributes extends ElectronicsCommon {
  sub_type: 'laptop';
  /** (required) CPU model or description. */
  cpu: string;
  /** (required) RAM in GB. */
  ram_gb: number;
  /** (optional) Storage capacity in GB. */
  storage_gb?: number;
  /** (optional) Screen size in inches. */
  screen_size_inches?: number;
  /** (optional) GPU model or description. */
  gpu?: string;
}

// ── 5.3 audio ──────────────────────────────────────────────────────────────

export interface AudioAttributes extends ElectronicsCommon {
  sub_type: 'audio';
  /** (required) Audio device type. */
  audio_type: 'earbuds' | 'headphones' | 'speaker' | 'soundbar';
  /** (optional) Whether active noise cancellation is supported. */
  noise_cancellation?: boolean;
  /** (optional) Whether wireless connectivity is supported. */
  wireless?: boolean;
  /** (optional) Battery life in hours. */
  battery_hours?: number;
}

// ── 5.4 wearable ───────────────────────────────────────────────────────────

export interface WearableAttributes extends ElectronicsCommon {
  sub_type: 'wearable';
  /** (required) Wearable device type. */
  wearable_type: 'smartwatch' | 'fitness_tracker' | 'smart_ring' | 'smart_glasses';
  /** (optional) Compatible operating systems. */
  os_compatibility?: string[];
  /** (optional) Battery life in days. */
  battery_days?: number;
  /** (optional) Water resistance rating. */
  water_resistance?: string;
  /** (optional) Health sensors available. */
  health_sensors?: string[];
}

// ── 5.5 gaming_hardware ────────────────────────────────────────────────────

export interface GamingHardwareAttributes extends ElectronicsCommon {
  sub_type: 'gaming_hardware';
  /** (required) Hardware device type. */
  hardware_type: 'console' | 'handheld' | 'controller' | 'vr_headset';
  /** (optional) Platform ecosystem. */
  platform_ecosystem?: string;
  /** (optional) Storage capacity in GB. */
  storage_gb?: number;
}

// ── 5.6 smart_home ─────────────────────────────────────────────────────────

export interface SmartHomeAttributes extends ElectronicsCommon {
  sub_type: 'smart_home';
  /** (required) Smart home device type. */
  device_type: 'speaker' | 'display' | 'camera' | 'thermostat' | 'lock' | 'light';
  /** (optional) Voice assistant compatibility. */
  voice_assistant?: string;
  /** (optional) Connectivity protocol. */
  connectivity_protocol?: ('wifi' | 'zigbee' | 'matter' | 'bluetooth' | 'zwave')[];
  /** (optional) Whether a hub is required. */
  hub_required?: boolean;
}

// ── 5.7 camera ─────────────────────────────────────────────────────────────

export interface CameraAttributes extends ElectronicsCommon {
  sub_type: 'camera';
  /** (required) Camera type. */
  camera_type: 'dslr' | 'mirrorless' | 'action' | 'instant' | 'drone';
  /** (optional) Sensor size description. */
  sensor_size?: string;
  /** (optional) Megapixel count. */
  megapixels?: number;
  /** (optional) Maximum video resolution. */
  video_resolution?: string;
}

export type ElectronicsAttributes =
  | SmartphoneAttributes
  | LaptopAttributes
  | AudioAttributes
  | WearableAttributes
  | GamingHardwareAttributes
  | SmartHomeAttributes
  | CameraAttributes;

// ═══════════════════════════════════════════════════════════════════════════
// 6. entertainment
// ═══════════════════════════════════════════════════════════════════════════

/** Fields shared by all entertainment sub_types. */
interface EntertainmentCommon {
  /** (required) Entertainment sub-category discriminator. */
  sub_type: EntertainmentSubType;
  /** (optional) Supported devices or platforms. */
  supported_devices?: string[];
  /** (optional) Age or content rating (e.g., ESRB T, PEGI 12, MPAA PG-13). */
  age_rating?: string;
  /** (optional) Supported languages. */
  languages?: string[];
}

/**
 * Entertainment attributes — common-only for v0.1.
 * Sub_type-specific attributes are defined in the spec but
 * deferred to a future schema revision for TypeScript typing.
 */
export type EntertainmentAttributes = EntertainmentCommon & Record<string, unknown>;

// ─── Top-Level Discriminated Union ──────────────────────────────────────────

export type CategoryAttributes =
  | { type: 'software_saas';       attributes: SoftwareSaasAttributes }
  | { type: 'travel_hospitality';  attributes: TravelHospitalityAttributes }
  | { type: 'education';           attributes: EducationAttributes }
  | { type: 'financial_service';   attributes: FinancialServiceAttributes }
  | { type: 'electronics';         attributes: ElectronicsAttributes }
  | { type: 'entertainment';       attributes: EntertainmentAttributes };
