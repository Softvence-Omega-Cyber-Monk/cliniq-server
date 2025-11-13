// src/mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get('MAIL_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
  }

  /**
   * Send support ticket created confirmation
   */
  async sendSupportTicketCreated(
    userEmail: string,
    subject: string,
    ticketId: string,
  ) {
    const mailOptions = {
      from: this.configService.get('MAIL_FROM', '"Support Team" <support@yourapp.com>'),
      to: userEmail,
      subject: `Support Ticket Created: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .ticket-id { background-color: #e8f5e9; padding: 10px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Support Ticket Created</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Your support ticket has been successfully created. Our team will review your request and respond as soon as possible.</p>
              
              <div class="ticket-id">
                <strong>Ticket ID:</strong> ${ticketId}<br>
                <strong>Subject:</strong> ${subject}
              </div>
              
              <p>You will receive email notifications when:</p>
              <ul>
                <li>Admin replies to your ticket</li>
                <li>Your ticket status changes</li>
                <li>Your ticket is resolved</li>
              </ul>
              
              <p>You can also check the status of your ticket in your dashboard.</p>
              
              <p>Thank you for contacting us!</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Send admin reply notification
   */
  async sendAdminReply(
    userEmail: string,
    userName: string,
    subject: string,
    reply: string,
    ticketId: string,
  ) {
    const mailOptions = {
      from: this.configService.get('MAIL_FROM', '"Support Team" <support@yourapp.com>'),
      to: userEmail,
      subject: `Admin Response: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .ticket-info { background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
            .reply-box { background-color: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Admin Response</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>An admin has replied to your support ticket:</p>
              
              <div class="ticket-info">
                <strong>Ticket ID:</strong> ${ticketId}<br>
                <strong>Subject:</strong> ${subject}
              </div>
              
              <div class="reply-box">
                <h3>Admin Response:</h3>
                <p>${reply.replace(/\n/g, '<br>')}</p>
              </div>
              
              <p>You can view the full conversation in your dashboard.</p>
              
              <p>If you have any additional questions, please reply to your ticket or contact us.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Send ticket resolved notification
   */
  async sendTicketResolved(
    userEmail: string,
    userName: string,
    subject: string,
    resolutionNote: string,
    ticketId: string,
  ) {
    const mailOptions = {
      from: this.configService.get('MAIL_FROM', '"Support Team" <support@yourapp.com>'),
      to: userEmail,
      subject: `Ticket Resolved: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .ticket-info { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .resolution-box { background-color: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .success-icon { font-size: 48px; text-align: center; color: #4CAF50; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Ticket Resolved</h1>
            </div>
            <div class="content">
              <div class="success-icon">✓</div>
              
              <p>Hello ${userName},</p>
              <p>Great news! Your support ticket has been resolved.</p>
              
              <div class="ticket-info">
                <strong>Ticket ID:</strong> ${ticketId}<br>
                <strong>Subject:</strong> ${subject}
              </div>
              
              <div class="resolution-box">
                <h3>Final Response:</h3>
                <p>${resolutionNote.replace(/\n/g, '<br>')}</p>
              </div>
              
              <p>If this issue is not fully resolved or if you have additional questions, please feel free to create a new support ticket.</p>
              
              <p>Thank you for using our support system!</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>If you need further assistance, please create a new support ticket.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Generic email sender (for custom use cases)
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ) {
    const mailOptions = {
      from: this.configService.get('MAIL_FROM', '"Support Team" <support@yourapp.com>'),
      to,
      subject,
      html,
    };

    return this.transporter.sendMail(mailOptions);
  }
}