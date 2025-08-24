A simple financing control app with JWT authentication, built with:
Backend: ASP.NET Core (C#)
Database: PostgreSQL
Frontend: HTML/CSS/JS (static pages)
Deployment: Docker

Run with Docker:
cd TaskTracker
docker-compose up --build

Web interface: http://localhost:5000/login.html

Простое приложение для управления финансами с интуитивно понятным интерфейсом.

Реализовано через API + база данных в контейнере Docker. Имеет три страницы (логин, регистрация и основная страница dashboard). В распоряжении список транзакций с фильтрами, график расходов и доходов за все время, дисплей текущего баланса и форма для добавления транзакции.