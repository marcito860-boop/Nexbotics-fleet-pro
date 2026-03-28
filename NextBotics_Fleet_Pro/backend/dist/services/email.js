"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMaintenanceNotification = exports.sendTripCompleted = exports.sendInspectionNotification = exports.sendVehicleAllocated = exports.sendApprovalNotification = exports.sendRequisitionRequest = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Your email address
const OWNER_EMAIL = 'masatrevis@gmail.com';
// Create transporter - uses environment variables or defaults to Ethereal for testing
const createTransporter = () => {
    // If SendGrid or other service is configured, use it
    if (process.env.SENDGRID_API_KEY) {
        return nodemailer_1.default.createTransport({
            service: 'SendGrid',
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            },
            connectionTimeout: 5000, // 5 seconds
            socketTimeout: 5000
        });
    }
    // If Gmail credentials are provided
    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
        return nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS
            },
            connectionTimeout: 5000,
            socketTimeout: 5000
        });
    }
    // Default: No email - just log to console (non-blocking)
    console.log('Email: No SMTP configured, logging to console only');
    return null;
};
const transporter = createTransporter();
// Send requisition request notification
const sendRequisitionRequest = async (staffName, details) => {
    // If no transporter configured, just log and return
    if (!transporter) {
        console.log('📧 Email (logged): New requisition from', staffName, 'to', details.destination);
        return { success: true, messageId: 'logged-to-console' };
    }
    const mailOptions = {
        from: '"Fleet System" <fleet@system.com>',
        to: OWNER_EMAIL,
        subject: `🚗 New Vehicle Requisition from ${staffName}`,
        html: `
      <h2>New Vehicle Requisition Request</h2>
      <p><strong>Requester:</strong> ${staffName}</p>
      <p><strong>From:</strong> ${details.place_of_departure}</p>
      <p><strong>To:</strong> ${details.destination}</p>
      <p><strong>Purpose:</strong> ${details.purpose}</p>
      <p><strong>Date:</strong> ${details.travel_date} at ${details.travel_time}</p>
      <p><strong>Passengers:</strong> ${details.num_passengers}</p>
      <hr>
      <p>Please log in to approve or reject this request.</p>
    `
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    }
    catch (error) {
        console.error('Email failed:', error);
        return { success: false, error: String(error) };
    }
};
exports.sendRequisitionRequest = sendRequisitionRequest;
// Send approval notification
const sendApprovalNotification = async (staffName, status, reason) => {
    if (!transporter) {
        console.log(`📧 Email (logged): Requisition ${status} for ${staffName}`);
        return { success: true };
    }
    const mailOptions = {
        from: '"Fleet System" <fleet@system.com>',
        to: OWNER_EMAIL,
        subject: `✅ Requisition ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        html: `
      <h2>Requisition ${status === 'approved' ? 'Approved' : 'Rejected'}</h2>
      <p><strong>Requester:</strong> ${staffName}</p>
      <p><strong>Status:</strong> ${status.toUpperCase()}</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <hr>
      <p>Check the system for more details.</p>
    `
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true };
    }
    catch (error) {
        console.error('Email failed:', error);
        return { success: false };
    }
};
exports.sendApprovalNotification = sendApprovalNotification;
// Send vehicle allocated notification
const sendVehicleAllocated = async (staffName, vehicleReg, driverName) => {
    if (!transporter) {
        console.log(`📧 Email (logged): Vehicle ${vehicleReg} allocated to ${staffName}, driver: ${driverName}`);
        return { success: true };
    }
    const mailOptions = {
        from: '"Fleet System" <fleet@system.com>',
        to: OWNER_EMAIL,
        subject: `🚗 Vehicle Allocated`,
        html: `
      <h2>Vehicle Allocated</h2>
      <p><strong>Requester:</strong> ${staffName}</p>
      <p><strong>Vehicle:</strong> ${vehicleReg}</p>
      <p><strong>Driver:</strong> ${driverName}</p>
      <hr>
      <p>The driver will conduct inspection before departure.</p>
    `
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true };
    }
    catch (error) {
        console.error('Email failed:', error);
        return { success: false };
    }
};
exports.sendVehicleAllocated = sendVehicleAllocated;
// Send inspection notification
const sendInspectionNotification = async (vehicleReg, driverName, passed) => {
    if (!transporter) {
        console.log(`📧 Email (logged): Inspection ${passed ? 'PASSED' : 'FAILED'} for ${vehicleReg}`);
        return { success: true };
    }
    const mailOptions = {
        from: '"Fleet System" <fleet@system.com>',
        to: OWNER_EMAIL,
        subject: `🔍 Vehicle Inspection ${passed ? 'Passed' : 'Failed'}`,
        html: `
      <h2>Vehicle Inspection ${passed ? 'Passed' : 'Failed'}</h2>
      <p><strong>Vehicle:</strong> ${vehicleReg}</p>
      <p><strong>Driver:</strong> ${driverName}</p>
      <p><strong>Result:</strong> ${passed ? '✅ PASSED - Ready for departure' : '❌ FAILED - Defects found'}</p>
      <hr>
      <p>Check the system for inspection details.</p>
    `
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true };
    }
    catch (error) {
        console.error('Email failed:', error);
        return { success: false };
    }
};
exports.sendInspectionNotification = sendInspectionNotification;
// Send trip completed notification
const sendTripCompleted = async (staffName, vehicleReg, distance) => {
    if (!transporter) {
        console.log(`📧 Email (logged): Trip completed by ${staffName}, ${distance}km`);
        return { success: true };
    }
    const mailOptions = {
        from: '"Fleet System" <fleet@system.com>',
        to: OWNER_EMAIL,
        subject: `✅ Trip Completed`,
        html: `
      <h2>Trip Completed</h2>
      <p><strong>Requester:</strong> ${staffName}</p>
      <p><strong>Vehicle:</strong> ${vehicleReg}</p>
      <p><strong>Distance:</strong> ${distance} km</p>
      <hr>
      <p>Please rate the driver.</p>
    `
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true };
    }
    catch (error) {
        console.error('Email failed:', error);
        return { success: false };
    }
};
exports.sendTripCompleted = sendTripCompleted;
// Send maintenance notification (when inspection fails)
const sendMaintenanceNotification = async (vehicleReg, driverName, defects) => {
    if (!transporter) {
        console.log(`📧 Email (logged): MAINTENANCE NEEDED for ${vehicleReg}: ${defects}`);
        return { success: true };
    }
    const mailOptions = {
        from: '"Fleet System" <fleet@system.com>',
        to: OWNER_EMAIL,
        subject: `🚨 MAINTENANCE REQUIRED: ${vehicleReg}`,
        html: `
      <h2 style="color: #dc2626;">🚨 Maintenance Required</h2>
      <p><strong>Vehicle:</strong> ${vehicleReg}</p>
      <p><strong>Reported By:</strong> ${driverName}</p>
      <p><strong>Issue:</strong></p>
      <div style="background: #fee2e2; padding: 10px; border-radius: 5px; margin: 10px 0;">
        ${defects}
      </div>
      <hr>
      <p><strong>Action Required:</strong> Please arrange for vehicle inspection/repair before next use.</p>
      <p>Trip has been halted until vehicle is fixed and re-inspected.</p>
    `
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Maintenance email sent:', info.messageId);
        return { success: true };
    }
    catch (error) {
        console.error('Maintenance email failed:', error);
        return { success: false };
    }
};
exports.sendMaintenanceNotification = sendMaintenanceNotification;
exports.default = {
    sendRequisitionRequest: exports.sendRequisitionRequest,
    sendApprovalNotification: exports.sendApprovalNotification,
    sendVehicleAllocated: exports.sendVehicleAllocated,
    sendInspectionNotification: exports.sendInspectionNotification,
    sendTripCompleted: exports.sendTripCompleted,
    sendMaintenanceNotification: exports.sendMaintenanceNotification
};
//# sourceMappingURL=email.js.map