
# LectraLive

## Project Overview

LectraLive is a web-based platform developed as part of the MGIS 360 course project. The purpose of this milestone was to establish the live infrastructure of the web application, including domain registration, hosting configuration, SSL setup, and GitHub version control integration. The frontend is built using HTML, CSS, and JavaScript, while Firebase is used for backend services such as authentication and database management. The website is deployed using Vercel and connected to a custom domain, forming a foundation for future development.

## Setup Notes

To set up the project locally, clone the repository using `git clone https://github.com/yourusername/lectralive.git` and navigate into the project directory with `cd lectralive`. Open `index.html` in a browser, or use a development server such as Live Server for real-time updates. Firebase is used to handle authentication and database services, and its configuration should be added to the appropriate configuration file while ensuring sensitive credentials are not committed to the repository. The project is deployed on Vercel, which automatically handles HTTPS/SSL provisioning, and is connected to a custom domain. Any push to the main branch triggers a new deployment, providing an accessible live version of the application.
