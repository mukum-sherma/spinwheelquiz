import type { Metadata } from "next";
import NavbarBanner from "../_components/navbar-banner";

export const metadata: Metadata = {
	title: "About Us",
	description:
		"Learn more about SpinWheelQuiz — create, customize and spin prize wheels for events, classrooms and giveaways.",
};

export default function AboutUsPage() {
	return (
		<div>
			<NavbarBanner />
			<div className="min-h-screen py-12 px-4">
				<div className="container mx-auto max-w-4xl">
					<h1 className="text-3xl font-bold text-slate-800 mb-6">
						About SpinWheelQuiz
					</h1>

					<div className="space-y-6 text-slate-700 leading-relaxed">
						<p className="text-lg">
							Welcome to <strong>SpinWheelQuiz</strong> — a playful, easy-to-use
							web app for creating customizable spin wheels. Use it to run
							raffles, classroom activities, team-building events, giveaways, or
							just for fun.
						</p>

						<h2 className="text-2xl font-semibold text-slate-800 mt-8">
							Our Mission
						</h2>
						<p>
							We want to make spinning a prize wheel delightful and simple.
							SpinWheelQuiz focuses on fast setup, attractive visuals, and
							configurable behavior (sounds, timers, and winner selection) so
							anyone can run an engaging spin experience.
						</p>

						<h2 className="text-2xl font-semibold text-slate-800 mt-8">
							What We Offer
						</h2>
						<p>
							SpinWheelQuiz provides a collection of features tailored for spin
							wheel experiences:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-4">
							<li>
								<strong>Custom Segments:</strong> Add labels, colors and images
								to each wheel slice.
							</li>
							<li>
								<strong>Sound Effects:</strong> Choose spin and winning sounds
								from the library or upload your own.
							</li>
							<li>
								<strong>Timer & Auto-Spin:</strong> Configure countdowns and
								automated spins for events.
							</li>
							<li>
								<strong>Winner Selection:</strong> Fair random selection with
								options to highlight or save winners.
							</li>
							<li>
								<strong>Share & Export:</strong> Share your wheel or export
								results for record-keeping.
							</li>
						</ul>

						<h2 className="text-2xl font-semibold text-slate-800 mt-8">
							Why Choose SpinWheelQuiz?
						</h2>
						<ul className="list-disc list-inside space-y-2 ml-4">
							<li>
								<strong>Fun & Engaging:</strong> Designed to capture attention
								at live events and in classrooms.
							</li>
							<li>
								<strong>Highly Customizable:</strong> Tailor the wheel to your
								brand or event.
							</li>
							<li>
								<strong>Mobile-Friendly:</strong> Works great on phones and
								tablets.
							</li>
							<li>
								<strong>Accessible:</strong> Simple controls and clear visuals
								make it easy for anyone to use.
							</li>
						</ul>

						<h2 className="text-2xl font-semibold text-slate-800 mt-8">
							Our Commitment
						</h2>
						<p>
							We continuously improve SpinWheelQuiz based on user feedback. If
							you have ideas or feature requests, please get in touch via the
							contact page.
						</p>

						<p className="mt-8 text-center italic">
							Thank you for using SpinWheelQuiz — let the best slice win!
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
