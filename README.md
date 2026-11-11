# SunuCare

**SunuCare** (*"Votre santé, plus proche de vous."*) is a cross-platform mobile healthcare appointment booking application designed for **Dakar, Senegal**. Built with **React Native**, **Expo**, **TypeScript**, **Expo Router**, and **Supabase (PostgreSQL)**, it connects patients with verified medical practitioners and healthcare facilities across Dakar.

---

## Project Description

Access to specialized medical consultations in Dakar often involves fragmented information regarding practitioner availability, clinic locations across neighborhoods, and consultation fees in **FCFA (XOF)**. SunuCare provides a unified mobile platform where patients can search for verified doctors by specialty, symptom keyword, or Dakar neighborhood, inspect transparent pricing in FCFA, and book in-person or teleconsultation appointments.

To protect patient safety, newly registered doctors are assigned a `pending` verification status (`verification_status = 'pending'`) and remain excluded from public search results until their professional credentials (such as their registration with the *Ordre National des Médecins du Sénégal* — ONMS) are reviewed and approved by an internal administrator.

---

## Main Objectives

1. **Facilitate Healthcare Access in Dakar**: Enable patients to quickly locate verified specialists and medical facilities across 12 key neighborhoods in Dakar (*Plateau, Almadies, Sacré-Cœur, Mermoz, Fann, Ouakam, Grand Yoff, Parcelles Assainies, Liberté 6, Médina, Yoff, Ngor*).
2. **Ensure Practitioner Verification**: Enforce a strict verification workflow so that only approved doctors (`verification_status = 'verified'`) appear in public search results and accept bookings.
3. **Guarantee Transactional Booking Integrity**: Prevent double bookings, duplicate active reservations, past-date bookings, and unauthorized status modifications through atomic transactions and PostgreSQL constraints.
4. **Deliver a Role-Based Mobile Experience**: Provide dedicated, protected interfaces for **Patients**, **Doctors**, and **Internal Administrators** running seamlessly on **Expo Go** (iOS and Android).

---

## Technologies Used

- **Mobile Framework**: React Native (`0.88.1`) & Expo SDK (`~58.0.24`)
- **Language**: TypeScript (`~6.0.3`)
- **Navigation**: Expo Router (`~58.0.31`) with file-based routing and role-based route guards
- **Backend & Database**: Supabase (`@supabase/supabase-js ^2.109.0`) — PostgreSQL, Supabase Auth, Supabase Storage, Row-Level Security (RLS), and PL/pgSQL RPC functions
- **Local Persistence**: `@react-native-async-storage/async-storage` (`2.2.0`) for session persistence and offline/demo fallback
- **UI & Icons**: Custom SunuCare Design System (`#147D75` Primary Teal, `#20B8A5` Secondary Mint, `#F7FAFA` Clinical Background) with `@expo/vector-icons`

---

## Main Implemented Features

### 1. Authentication & Role-Based Access Control
- Email and password registration and login via Supabase Auth with persistent sessions.
- Senegalese phone number validation (`+221 70/75/76/77/78/33 XX XXX XX`).
- Public registration restricted to **Patient** (`patient`) and **Doctor** (`doctor`) accounts.
- Automatic role-based routing and route protection separating Patient (`/(tabs)`), Doctor (`/doctor-space`), and internal Admin (`/admin-space`) areas.

### 2. Patient Experience
- **Home Dashboard**: Personalized greeting, Dakar location indicator, upcoming appointment preview, specialty categories, featured verified doctors, and nearby healthcare facilities.
- **Medical Search Engine (Dakar)**:
  - Search by doctor name, medical specialty, clinic/hospital name, Dakar neighborhood, consultation type (*In-person* or *Teleconsultation*), availability, and price range in FCFA.
  - French symptom and lay-term synonym resolution (e.g., `"coeur"` → *Cardiologie*, `"peau"` → *Dermatologie*, `"dents"` → *Dentisterie*, `"enfants"` → *Pédiatrie*, `"yeux"` → *Ophtalmologie*).
  - Case-insensitive matching, typo tolerance, debounced input, autocomplete suggestions, relevance ranking, and pagination.
- **Doctor & Facility Profiles**: Detailed practitioner biographies, ONMS registration details, consultation fees in FCFA, clinic addresses, and available time slots.
- **Appointment Booking & Management**:
  - Step-by-step booking workflow (consultation type, date, verified slot selection, summary, confirmation).
  - Categorized views for *Upcoming*, *Past*, and *Cancelled* appointments, with cancellation and rebooking support.
- **Favorites & In-App Notification Center**:
  - Save and remove favorite verified doctors without duplicates.
  - Recipient-isolated in-app notifications for booking requests, confirmations, rejections, cancellations, reminders, and verification updates.

### 3. Doctor Experience
- **Doctor Dashboard**: Verification status banner (`pending`, `verified`, `rejected`), today's consultations, pending requests, confirmed appointments, and upcoming schedule.
- **Appointment Management**: Confirm or reject pending requests (with a required reason on rejection), mark confirmed consultations as completed with clinical notes, or cancel with a stated reason.
- **Availability Management**: Configure weekly working hours, consultation duration (15–60 minutes), vacation mode, blocked date ranges, and custom slots while protecting existing confirmed appointments from conflicts.
- **Professional Profile Management**: Update biography, sub-specialties, consultation fees in FCFA, practice address, and consultation types.

### 4. Internal Administration & Governance
- **Admin Dashboard**: Overview of registered patients, registered doctors, pending verification requests, verified doctors, rejected requests, and appointment statistics in FCFA.
- **Doctor Verification Workflow**: Inspect doctor applications, review supporting documents stored in the private `doctor-verification-documents` bucket, approve or reject applications with mandatory decision reasons, and inspect the administrative audit log.

### Current Scope & Notes
- **Push Notifications**: The in-app notification center is fully implemented and the Expo Push notification service structure is prepared; however, remote push delivery (FCM/APNs) requires a physical device with an EAS development build and push credentials.
- **Payments & Teleconsultation**: Consultation fees are displayed and tracked in **FCFA (XOF)** for payment at the medical facility; online Mobile Money processing and live video streaming are not included in this version.

---

## Project Structure

```text
SunuCare/
├── app/                                  # Expo Router screens and navigation layouts
│   ├── _layout.tsx                       # Root Stack navigator
│   ├── index.tsx                         # Welcome screen
│   ├── notifications.tsx                 # In-app notification center
│   ├── search-results.tsx                # Paginated medical search results
│   ├── (auth)/                           # Authentication screens (login, register, forgot-password)
│   ├── (tabs)/                           # Patient navigation tabs (Home, Search, Appointments, Favorites, Profile)
│   ├── doctor/[id].tsx                   # Public verified doctor profile screen
│   ├── facility/[id].tsx                 # Healthcare facility profile screen
│   ├── booking/                          # Transactional appointment booking & confirmation screens
│   ├── appointments/[id].tsx             # Appointment detail and cancellation screen
│   ├── doctor-space/                     # Protected Doctor dashboard, schedule, appointments & profile
│   └── admin-space/                      # Protected Admin dashboard & doctor verification workflow
├── assets/                               # Application icons, splash screen, and fonts
├── components/                           # Reusable UI components
│   ├── common/                           # Buttons, inputs, cards, badges, loading/empty/error states
│   ├── doctors/                          # DoctorCard, SpecialtyCard
│   ├── layout/                           # ScreenWrapper, CustomHeader
│   └── search/                           # SearchBar and filter components
├── constants/                            # Theme palette, typography, spacing, and app configuration
├── context/
│   └── AuthContext.tsx                   # Authentication state provider and route protection guards
├── hooks/                                # Custom React hooks (useDebounce, useTheme)
├── lib/
│   └── supabase.ts                       # Supabase client initialized with AsyncStorage
├── services/                             # Business logic and data access services
│   ├── authService.ts                    # Authentication, registration, and profile updates
│   ├── doctorService.ts                  # Doctor directory, facility lookup, and Dakar search engine
│   ├── appointmentService.ts             # Atomic booking engine and appointment lifecycle transitions
│   ├── availabilityService.ts            # Doctor schedule configuration and conflict protection
│   ├── favoriteService.ts                # Patient favorites persistence and deduplication
│   ├── notificationService.ts            # Recipient-only in-app notifications
│   ├── adminService.ts                   # Admin metrics, doctor verification, and audit logging
│   └── mockData.ts                       # Seed data for Dakar doctors, clinics, and specialties
├── supabase/
│   └── migrations/                       # PostgreSQL schema, indexes, RLS policies, and RPC functions
│       ├── 20261112_phase1_4_initial_schema.sql
│       ├── 20261112_phase5_medical_search.sql
│       ├── 20261112_phase6_transactional_booking.sql
│       └── 20261112_phase7_favorites_notifications_admin.sql
├── types/                                # TypeScript interfaces (user, doctor, appointment, notification, admin)
└── utils/                                # Search ranking/synonyms, Senegalese validators, and FCFA formatters
```

---

## Installation Instructions

### Prerequisites
- **Node.js** (v18 or newer recommended)
- **npm** (or **bun**)
- **Expo Go** app installed on an iOS or Android mobile device

### Setup Steps
1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/aligueye626/SunuCare.git
   cd SunuCare
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Verify TypeScript types and Expo project health:
   ```bash
   npx tsc --noEmit
   npx expo-doctor
   ```

---

## Configuring Supabase with Environment Variables

1. Create a `.env` file in the root directory by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and provide your Supabase project URL and public anonymous key:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
   ```
   > **Security Note**: Never place a `service_role` secret key in `.env` or anywhere in the mobile client codebase. Only the public `anon` key should be used, backed by PostgreSQL Row-Level Security (RLS).

3. In your Supabase project's **SQL Editor**, run the migration files located in `supabase/migrations/` in chronological order:
   1. `supabase/migrations/20261112_phase1_4_initial_schema.sql`
   2. `supabase/migrations/20261112_phase5_medical_search.sql`
   3. `supabase/migrations/20261112_phase6_transactional_booking.sql`
   4. `supabase/migrations/20261112_phase7_favorites_notifications_admin.sql`

> **Local Demonstration Mode**: If `.env` is left with placeholder values, SunuCare automatically runs in local persistent mode using `AsyncStorage` and pre-populated Dakar medical data so all workflows can be tested immediately in Expo Go.

---

## Running the Application with Expo Go

1. Start the Expo development server:
   ```bash
   npx expo start -c
   ```

2. Connect your mobile device:
   - **Android**: Open the **Expo Go** app and scan the QR code displayed in the terminal.
   - **iOS**: Open the default **Camera** app and scan the QR code to launch in **Expo Go**.
   - If your computer and phone are on different networks, start with `npx expo start --tunnel`.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
