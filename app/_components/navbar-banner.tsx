import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";

const adalima = localFont({
	src: "../_fonts/adalima.ttf",
	variable: "--font-adalima",
});

const NavbarBanner = () => {
	return (
		<div className="bg-orange-200/90 shadow-lg">
			<div className="container mx-auto flex h-[64px] items-center justify-between px-4">
				<section className="font-bold text-lg tracking-wide text-orange-950">
					<Link
						href="/"
						className="flex items-center gap-3 hover:opacity-80 transition-opacity"
					>
						<Image
							src="/banner.png"
							alt="SpinWheelQuiz Logo"
							width={50}
							height={50}
							className="object-contain"
						/>
						<span
							className={`uppercase font-medium ${adalima.className} mt-1 text-[20px] tracking-widest text-shadow-[0_0px_1px_rgba(255,255,255,0.4)]`}
						>
							SpinWheelQuiz
						</span>
					</Link>
				</section>
			</div>
		</div>
	);
};

export default NavbarBanner;
