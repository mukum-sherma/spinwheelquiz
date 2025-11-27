import Link from "next/link";

export default function Footer() {
	const year = new Date().getFullYear();
	return (
		<footer className="w-full py-12 bg-[#404040] footer-no-hover shadow-none">
			<div className="container mx-auto px-4 max-w-6xl">
				{/* Main Footer Content */}
				<div className="grid md:flex md:justify-around  gap-8 mb-8">
					{/* Brand Section */}
					<div>
						<h3 className="text-2xl font-bold text-white mb-2">
							SpinWheelQuiz
						</h3>
						<p className="text-slate-200 font-medium mb-1">
							Create and spin customizable prize wheels — fun for events,
							classrooms and giveaways.
						</p>
						<p className="text-sm text-slate-300 md:max-w-[90%] ">
							Build beautiful, shareable spin wheels with custom segments,
							images, sounds, timers and winner selection — fast and
							mobile-friendly.
						</p>
					</div>

					{/* Quick Links Section */}
					<div className="">
						<h4 className="text-lg font-semibold text-white mb-4">
							Quick Links
						</h4>
						<div className="flex flex-col gap-2 hover:shadow-none hover:bg-transparent hover:translate-y-0">
							<Link
								href="/aboutus"
								className="text-white hover:text-slate-200 hover:underline hover:shadow-none hover:translate-y-0 transition-colors"
							>
								About
							</Link>
							<Link
								href="/contactus"
								className="text-white hover:text-slate-200 hover:underline hover:shadow-none hover:translate-y-0 transition-colors"
							>
								Contact
							</Link>
							<Link
								href="/privacypolicy"
								className="text-white hover:text-slate-200 hover:underline hover:shadow-none hover:translate-y-0 transition-colors"
							>
								Privacy Policy
							</Link>
						</div>
					</div>

					{/* Contact column removed per request */}
				</div>

				{/* Bottom Copyright Section */}
				<div className="pt-6 border-t border-transparent">
					<p className="text-sm text-slate-200 md:text-center">
						SpinWheelQuiz © {year} — All rights reserved.
					</p>
				</div>
			</div>
		</footer>
	);
}
