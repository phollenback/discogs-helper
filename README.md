# Grailtopia - Application Overview

<i>Test it out:</i> https://grail-topia.com
<br /><br />
<i>For a description of all application services and there configurations, view that <a href="https://github.com/phollenback/discogs-helper/blob/main/Services.md#services">here</a></i>

Grailtopia is a production-grade, full-stack web application deployed on AWS EC2 and managed through a fully automated CI/CD pipeline using GitHub Actions. The system is containerized with Docker Compose and includes a React frontend, TypeScript/Express backend, and MySQL database running behind an Nginx reverse proxy with automatic HTTPS.
<br /> <br /> 
Grailtopia integrates directly with the Discogs API using OAuth 1.0, allowing secure user authentication and real-time access to their collection data. Through this integration, the application can pull accurate release information, metadata, and artwork straight from Discogs, keeping user libraries synchronized with their live Discogs accounts.

---
# Grailtopia's next steps ... Grailmeter

If your like me, I am in a mad dash to gather all of my personal data in an effort to create insight for my own life in a few key areas: Personal Finance, Health, and even hobby analytics that can be easily flipped into cool personal dashboards with meaningful data.
<br /> <br />
In the case of Grailtopia, I feel there is a real opportunity for replicating well known music tracking features that come out at the end of the year into the world of physical media. We all have heard of the two big players in the arena -- Spotify Wrapped and Apple Replay. With the groundwork already established with my discogs-helper API, I think this project can easily evolve into unique system for tracking cinyl playback from real turntables.
<br /> <br />
This is not meant to be a consumer product by any means, it is a personal, "set-and-forget" solution for capturing your own vinyl listening patterns. The early design provides a solid foundation for a model that can reliably track plays throughout the year and visualize that data in a meaningful way.

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
