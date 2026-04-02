# Grailtopia - Application Overview

<i>Try it out:</i> https://grail-topia.com  
<br />
--- 

<i>For a full breakdown of application services and configurations, view the documentation <a href="https://github.com/phollenback/discogs-helper/blob/main/Services.md#services">here</a>.</i>  

Grailtopia is a production-grade, full-stack web application deployed on AWS EC2 with a fully automated CI/CD pipeline via GitHub Actions. It uses Docker Compose with a React frontend, TypeScript/Express backend, and MySQL database behind an Nginx reverse proxy with automatic HTTPS.  

The app integrates with the Discogs API using OAuth 1.0 to provide secure authentication and real-time access to user collection data, keeping libraries synced with accurate release details, metadata, and artwork.

---
# Grailtopia's next steps ... Grailmeter

With Grailtopia, the goal is to bring end-of-year music insights (like Spotify Wrapped and Apple Replay) into the world of physical media. Building on the Discogs integration, this project aims to track real vinyl playback directly from your turntable.

It’s designed as a set-and-forget system that captures listening habits over time and turns them into meaningful visual insights.

---
### **Here are the basic components, as well as a diagrammed high-level overview:**

### **Client (Browser)**  
The user-facing interface where individuals can view vinyl playback history, session data, and derived insights, as well as interact with the system for configuration and manual input.

### **Vinyl Player**  
The physical turntable being tracked during playback, acting as the source of playback activity by producing detectable signals (such as power state changes or platter motion) that indicate when a listening session has started or stopped.

### **Raspberry Pi + Camera**  
An edge device responsible for monitoring the turntable environment, capturing visual data of the spinning record, and processing or transmitting that data to identify the record and report playback events to the backend system.
<br />
<img width="1329" height="705" alt="Screenshot 2025-12-07 at 3 12 39 PM" src="https://github.com/user-attachments/assets/567f9b90-cd39-437a-92d7-ce7e9c895a2f" />
<br />

<img width="1300" height="589" alt="Screenshot 2026-04-01 at 6 15 34 PM" src="https://github.com/user-attachments/assets/95e86788-aa63-4235-b9f9-fd59f82918a0" />

___
## System UML Modeling from 10/2024
<img width="1114" height="746" alt="Screenshot 2026-04-01 at 6 58 23 PM" src="https://github.com/user-attachments/assets/45479c57-1f17-4526-87dc-d33add1066e3" />

