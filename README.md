# 🚗 Zipo: Peer-to-Peer Car Rental & Management App

**Zipo** is a high-performance, cross-platform mobile application for modern peer-to-peer car rental and owner management. Built with React Native and TypeScript, this app provides a robust foundation for launching a scalable mobility platform targeting fast-paced, urban markets.

## 🔥 Key Features

Zipo is designed to handle the core functionalities of a P2P car sharing service for both the renter and the owner:

### 🚘 Core Mobility Features

- **Car Browsing & Filtering:** Intuitive search for available cars based on location, dates, price, and vehicle type.
- **Secure Booking System:** Seamless flow from selection to payment confirmation.
- **Location-Aware:** GPS integration for accurate pickup/drop-off locations.
- **User Management:** Dedicated dashboards for renters (booking history) and owners (car listings, earnings).
- **Booking Management:** Owners can track upcoming, active, and past rentals, and manage car availability.

### ⚙️ Technical & Business Features

- **Cross-Platform:** Single codebase for native performance on both Android and iOS (via React Native/Expo).
- **Secure Sign-In:** Easy and secure authentication using Google Sign-In (Firebase Integration).
- **Monetization Ready:** Structure ready for in-app subscriptions and premium features (via RevenueCat or custom IAP).
- **Modular Architecture:** Clean Redux structure and reusable UI components for easy scaling.

## 💻 Tech Stack

| Technology                | Purpose                                               |
| :------------------------ | :---------------------------------------------------- |
| **React Native**          | Cross-platform mobile development framework           |
| **TypeScript**            | Type safety and enhanced tooling                      |
| **Expo**                  | Development environment and tooling for fast setup    |
| **React Navigation**      | App routing and navigation flow                       |
| **Redux Toolkit**         | Scalable state management                             |
| **Firebase**              | Authentication, Real-time Database (Backend Services) |
| **Vector Icons**          | High-quality, scalable iconography                    |
| **RevenueCat (Optional)** | In-app purchase management and analytics              |

## 🚀 Getting Started

Follow these steps to get your local copy of Zipo up and running.

### Prerequisites

You need the following installed globally:

- **Node.js** (LTS version recommended)
- **Expo CLI**
  ```bash
  npm install -g expo-cli
  ```

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Brutalvik/zipo
    cd zipo
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # Note: Includes @reduxjs/toolkit and react-redux installed previously
    ```

### Running the App

1.  **Start the development server:**
    ```bash
    npm start
    # OR
    expo start
    ```
2.  **View on Device/Simulator:**
    - **On Physical Device:** Download the **Expo Go** app on your phone and scan the QR code displayed in the terminal.
    - **On Simulator:** Press `i` (iOS) or `a` (Android) in the terminal to launch the respective simulator (requires Xcode or Android Studio setup).

## ⚙️ Project Structure & Architecture

The project is structured with scalability in mind, separating UI, logic, and utilities.
