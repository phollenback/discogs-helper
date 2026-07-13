# Grailtopia - Application Overview

<i>Try it out:</i> https://grail-topia.com  
<br />
--- 

<i>For a full breakdown of application services and configurations, view the documentation <a href="https://github.com/phollenback/discogs-helper/blob/main/Services.md#services">here</a>.</i>  

Grailtopia is a production-grade, full-stack web application deployed on AWS EC2 with a fully automated CI/CD pipeline via GitHub Actions. It uses Docker Compose with a React frontend, TypeScript/Express backend, and MySQL database behind an Nginx reverse proxy with automatic HTTPS.  

The app integrates with the Discogs API using OAuth 1.0 to provide secure authentication and real-time access to user collection data, keeping libraries synced with accurate release details, metadata, and artwork.

---


