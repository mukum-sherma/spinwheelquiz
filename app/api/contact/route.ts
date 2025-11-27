import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

type Body = { name?: string; email?: string; message?: string };

// In-memory rate limiting store: IP -> array of submission timestamps
const rateLimitStore = new Map<string, number[]>();
const RATE_LIMIT_MAX = 4; // Maximum submissions per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Helper to get client IP address
function getClientIP(request: Request): string {
	// Check common headers for client IP (useful behind proxies/CDNs)
	const forwarded = request.headers.get("x-forwarded-for");
	const realIP = request.headers.get("x-real-ip");
	const cfConnectingIP = request.headers.get("cf-connecting-ip");

	if (forwarded) {
		// x-forwarded-for can be a comma-separated list; take the first one
		return forwarded.split(",")[0].trim();
	}
	if (cfConnectingIP) return cfConnectingIP;
	if (realIP) return realIP;

	// Fallback (in local dev this might be ::1 or similar)
	return "unknown";
}

// Helper to check and update rate limit for an IP
function checkRateLimit(ip: string): { allowed: boolean; resetTime?: number } {
	const now = Date.now();
	const submissions = rateLimitStore.get(ip) || [];

	// Remove timestamps older than 1 hour
	const recentSubmissions = submissions.filter(
		(timestamp) => now - timestamp < RATE_LIMIT_WINDOW
	);

	if (recentSubmissions.length >= RATE_LIMIT_MAX) {
		// Rate limit exceeded
		const oldestTimestamp = recentSubmissions[0];
		const resetTime = oldestTimestamp + RATE_LIMIT_WINDOW;
		return { allowed: false, resetTime };
	}

	// Add current submission timestamp
	recentSubmissions.push(now);
	rateLimitStore.set(ip, recentSubmissions);

	return { allowed: true };
}

export async function POST(request: Request) {
	try {
		// Get client IP and check rate limit
		const clientIP = getClientIP(request);
		const rateLimitCheck = checkRateLimit(clientIP);

		if (!rateLimitCheck.allowed) {
			const resetTime =
				rateLimitCheck.resetTime || Date.now() + RATE_LIMIT_WINDOW;
			const minutesUntilReset = Math.ceil(
				(resetTime - Date.now()) / (60 * 1000)
			);

			return NextResponse.json(
				{
					error: `You have reached the submission limit. Please try again in ${minutesUntilReset} minute${
						minutesUntilReset !== 1 ? "s" : ""
					}.`,
				},
				{ status: 429 }
			);
		}

		const body: Body = await request.json();
		const { name, email, message } = body;

		if (!name || !email || !message) {
			return NextResponse.json(
				{ error: "All fields are required" },
				{ status: 400 }
			);
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{ error: "Invalid email format" },
				{ status: 400 }
			);
		}

		// SMTP configuration via environment variables
		const SMTP_HOST = process.env.SMTP_HOST;
		const SMTP_PORT = process.env.SMTP_PORT
			? parseInt(process.env.SMTP_PORT, 10)
			: undefined;
		const SMTP_USER = process.env.SMTP_USER;
		const SMTP_PASS = process.env.SMTP_PASS;
		const SMTP_SECURE = process.env.SMTP_SECURE === "true";
		const FROM_ADDRESS =
			process.env.SMTP_FROM ||
			SMTP_USER ||
			`noreply@${process.env.NEXT_PUBLIC_SITE_DOMAIN || "example.com"}`;

		if (!SMTP_HOST || !SMTP_PORT) {
			console.error(
				"SMTP configuration missing: set SMTP_HOST and SMTP_PORT in environment"
			);
			return NextResponse.json(
				{ error: "Mail service not configured" },
				{ status: 500 }
			);
		}

		const transporter = nodemailer.createTransport({
			host: SMTP_HOST,
			port: SMTP_PORT,
			secure: SMTP_SECURE,
			auth:
				SMTP_USER && SMTP_PASS
					? { user: SMTP_USER, pass: SMTP_PASS }
					: undefined,
		});

		const mailOptions = {
			from: `${name} <${FROM_ADDRESS}>`,
			to: "sherma.mukum@gmail.com",
			subject: `SpinWheelQuiz.com Contact Form Submission`,
			text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
			replyTo: email,
		} as const;

		await transporter.sendMail(mailOptions);

		return NextResponse.json({ success: true, message: "Email sent" });
	} catch (err) {
		console.error("Contact form error:", err);
		return NextResponse.json(
			{ error: "Failed to send message" },
			{ status: 500 }
		);
	}
}
