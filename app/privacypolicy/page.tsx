import type { Metadata } from "next";
import NavbarBanner from "../_components/navbar-banner";

export const metadata: Metadata = {
	title: "Privacy Policy",
	description:
		"Learn about how SpinWheelQuiz collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
	return (
		<div>
			<NavbarBanner />
			<div className="min-h-screen py-12 px-4">
				<div className="container mx-auto max-w-4xl">
					<h1 className="text-3xl font-bold text-slate-800 mb-4">
						Privacy Policy
					</h1>
					{/* <p className="text-slate-600 mb-8">
					<strong>Effective Date:</strong> November 16, 2025
				</p> */}

					<div className="space-y-8 text-slate-700 leading-relaxed">
						<section>
							<h2 className="text-2xl font-semibold text-slate-800 mb-3">
								1. Introduction
							</h2>
							<p>
								Welcome to SpinWheelQuiz (&quot;we,&quot; &quot;our,&quot; or
								&quot;us&quot;). We are committed to protecting your privacy and
								ensuring you have a positive experience on our website. This
								Privacy Policy explains how we collect, use, disclose, and
								safeguard your information when you visit our website
								spinwheelquiz.com.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold text-slate-800 mb-3">
								2. Information We Collect
							</h2>
							<h3 className="text-xl font-semibold text-slate-700 mt-4 mb-2">
								2.1 Information You Provide
							</h3>
							<p>
								We may collect personal information that you voluntarily provide
								to us when you:
							</p>
							<ul className="list-disc list-inside space-y-2 ml-4 mt-2">
								<li>Contact us through our contact form</li>
								<li>Subscribe to our newsletter</li>
								<li>Provide feedback or suggestions</li>
							</ul>
							<p className="mt-2">
								This information may include your name, email address, and any
								other information you choose to provide.
							</p>

							<h3 className="text-xl font-semibold text-slate-700 mt-4 mb-2">
								2.2 Automatically Collected Information
							</h3>
							<p>
								When you visit our website, we automatically collect certain
								information about your device, including:
							</p>
							<ul className="list-disc list-inside space-y-2 ml-4 mt-2">
								<li>IP address</li>
								<li>Browser type and version</li>
								<li>Operating system</li>
								<li>Pages visited and time spent on pages</li>
								<li>Referring website addresses</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-semibold text-slate-800 mb-3">
								3. How We Use Your Information
							</h2>
							<p>We use the information we collect to:</p>
							<ul className="list-disc list-inside space-y-2 ml-4 mt-2">
								<li>Provide, maintain, and improve our services</li>
								<li>Respond to your inquiries and provide customer support</li>
								<li>
									Send you updates, newsletters, and promotional materials
								</li>
								<li>Analyze usage patterns and improve user experience</li>
								<li>Detect, prevent, and address technical issues</li>
								<li>Comply with legal obligations</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-semibold text-slate-800 mb-3">
								4. Cookies and Tracking Technologies
							</h2>
							<p>
								We use cookies and similar tracking technologies to track
								activity on our website and store certain information. Cookies
								are files with a small amount of data that are sent to your
								browser from a website and stored on your device.
							</p>
							<p className="mt-2">
								You can instruct your browser to refuse all cookies or to
								indicate when a cookie is being sent. However, if you do not
								accept cookies, you may not be able to use some portions of our
								website.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold text-slate-800 mb-3">
								5. Third-Party Services
							</h2>
							<p>
								We may use third-party service providers to help us operate our
								website and provide our services. These third parties may have
								access to your information only to perform specific tasks on our
								behalf and are obligated not to disclose or use it for any other
								purpose.
							</p>
							<p className="mt-2">
								Our website may use the following third-party services:
							</p>
							<ul className="list-disc list-inside space-y-2 ml-4 mt-2">
								<li>
									<strong>Google Analytics:</strong> To analyze website traffic
									and usage patterns
								</li>
								<li>
									<strong>Google AdSense:</strong> To display advertisements
								</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-semibold text-slate-800 mb-3">
								6. Data Security
							</h2>
							<p>
								We implement appropriate technical and organizational security
								measures to protect your personal information against
								unauthorized access, alteration, disclosure, or destruction.
								However, no method of transmission over the internet or
								electronic storage is 100% secure, and we cannot guarantee
								absolute security.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold text-slate-800 mb-3">
								7. Your Rights
							</h2>
							<p>You have the right to:</p>
							<ul className="list-disc list-inside space-y-2 ml-4 mt-2">
								<li>Access the personal information we hold about you</li>
								<li>Request correction of inaccurate information</li>
								<li>Request deletion of your personal information</li>
								<li>
									Object to or restrict certain processing of your information
								</li>
								<li>Opt-out of receiving marketing communications</li>
							</ul>
							<p className="mt-2">
								To exercise any of these rights, please contact us using the
								information provided below.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold text-slate-800 mb-3">
								8. Children&apos;s Privacy
							</h2>
							<p>
								Our website is not intended for children under the age of 13. We
								do not knowingly collect personal information from children
								under 13. If you believe we have collected information from a
								child under 13, please contact us immediately.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold text-slate-800 mb-3">
								9. Changes to This Privacy Policy
							</h2>
							<p>
								We may update this Privacy Policy from time to time. We will
								notify you of any changes by posting the new Privacy Policy on
								this page and updating the &quot;Effective Date&quot; at the
								top. We encourage you to review this Privacy Policy periodically
								for any changes.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold text-slate-800 mb-3">
								10. Contact Us
							</h2>
							<p>
								If you have any questions or concerns about this Privacy Policy
								or our privacy practices, please contact us at:
							</p>
							<div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
								<p>
									<strong>Email:</strong>{" "}
									<a
										href="mailto:privacy@spinwheelquiz.com"
										className="text-blue-600 hover:underline"
									>
										privacy@spinwheelquiz.com
									</a>
								</p>
								<p className="mt-2">
									<strong>Website:</strong>{" "}
									<a
										href="https://spinwheelquiz.com"
										className="text-blue-600 hover:underline"
									>
										https://spinwheelquiz.com
									</a>
								</p>
							</div>
						</section>

						<div className="mt-12 pt-8 border-t border-slate-200">
							<p className="text-sm text-slate-600 italic">
								By using our website, you acknowledge that you have read and
								understood this Privacy Policy and agree to its terms.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
