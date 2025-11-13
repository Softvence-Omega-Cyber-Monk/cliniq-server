import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>CliniQ Backend</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg-light: #f8fafc;
            --text-light: #0f172a;
            --text-dark: #f1f5f9;
            --accent: #3b82f6;
            --card-light: #ffffffcc;
          }

          body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, var(--bg-light), #e2e8f0);
            color: var(--text-light);
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.4s ease;
          }
          .card {
            background: var(--card-light);
            padding: 60px 90px;
            border-radius: 18px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.08);
            backdrop-filter: blur(15px);
            text-align: center;
            transition: all 0.4s ease;
          }

          h1 {
            font-size: 2.5rem;
            font-weight: 600;
            margin-bottom: 10px;
          }

          p {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 25px;
          }

          .logo {
            font-size: 3.5rem;
            margin-bottom: 15px;
          }

          .badge {
            display: inline-block;
            background: var(--accent);
            color: white;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 0.9rem;
            margin-bottom: 20px;
            letter-spacing: 0.5px;
          }

          a {
            text-decoration: none;
            color: var(--accent);
            font-weight: 600;
            transition: color 0.3s ease;
          }

          a:hover {
            color: #2563eb;
          }

          .footer {
            font-size: 0.85rem;
            opacity: 0.8;
            margin-top: 30px;
          }

          @media (max-width: 640px) {
            .card {
              padding: 40px;
              width: 85%;
            }
            h1 {
              font-size: 2rem;
            }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🩺</div>
          <span class="badge">CliniQ Backend</span>
          <h1>Welcome to <span style="background: #3b82f6; color: white; padding: 0px 10px; border-radius: 40px;">CliniQ API Server</span></h1>
          <p>Your backend is up and running successfully 🚀</p>
          <a href="/docs" target="_blank">View Documentation →</a>
          <div class="footer">© ${new Date().getFullYear()} CliniQ • Powered by NestJS</div>
        </div>
      </body>
      </html>
    `;
  }
}
