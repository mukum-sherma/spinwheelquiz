"use client";

import { useState } from "react";
import NavbarBanner from "../_components/navbar-banner";

export default function ContactUsPage() {
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		message: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitStatus, setSubmitStatus] = useState<{
		type: "success" | "error" | null;
		message: string;
	}>({ type: null, message: "" });

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setSubmitStatus({ type: null, message: "" });

		try {
			const res = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});

			const text = await res.text();
			let data: { error?: string; message?: string } = {};
			try {
				data = text ? JSON.parse(text) : {};
			} catch {
				data = { error: text };
			}

			if (!res.ok)
				throw new Error(
					data.error || data.message || `Server error ${res.status}`
				);

			setSubmitStatus({
				type: "success",
				message:
					"Thank you for contacting us! We'll get back to you as soon as possible.",
			});
			setFormData({ name: "", email: "", message: "" });
		} catch (err) {
			console.error("Contact submit error:", err);
			setSubmitStatus({
				type: "error",
				message: err instanceof Error ? err.message : "Failed to send message",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	return (
		<div>
			<NavbarBanner />
			<div className="min-h-screen py-12 px-4">
				<div className="container mx-auto max-w-2xl">
					<h1 className="text-3xl font-bold text-slate-800 mb-4">Contact Us</h1>
					<p className="text-slate-600 mb-8">
						Have a question about SpinWheelQuiz, need help with a wheel, or want
						to suggest a feature? Fill out the form below and we&apos;ll get
						back to you as soon as possible.
					</p>

					<form
						onSubmit={handleSubmit}
						className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6"
					>
						{/* Name Field */}
						<div className="space-y-2">
							<label
								htmlFor="name"
								className="block text-sm font-medium text-slate-700"
							>
								Name <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								id="name"
								name="name"
								value={formData.name}
								onChange={handleChange}
								required
								className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="Your name"
							/>
						</div>

						{/* Email Field */}
						<div className="space-y-2">
							<label
								htmlFor="email"
								className="block text-sm font-medium text-slate-700"
							>
								Email <span className="text-red-500">*</span>
							</label>
							<input
								type="email"
								id="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								required
								className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="your.email@example.com"
							/>
						</div>

						{/* Message Field */}
						<div className="space-y-2">
							<label
								htmlFor="message"
								className="block text-sm font-medium text-slate-700"
							>
								Message <span className="text-red-500">*</span>
							</label>
							<textarea
								id="message"
								name="message"
								value={formData.message}
								onChange={handleChange}
								required
								rows={6}
								className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
								placeholder="Tell us what's on your mind..."
							/>
						</div>

						{/* Submit Status */}
						{submitStatus.type && (
							<div
								className={`p-4 rounded-md ${
									submitStatus.type === "success"
										? "bg-green-50 text-green-800 border border-green-200"
										: "bg-red-50 text-red-800 border border-red-200"
								}`}
							>
								{submitStatus.message}
							</div>
						)}

						{/* Submit Button */}
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isSubmitting ? "Sending..." : "Send Message"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
