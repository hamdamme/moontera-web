import Image from "next/image";

const images = [
  "/images/gallery/loading/loading-1.jpeg",
  "/images/gallery/loading/loading-2.jpeg",
  "/images/gallery/loading/loading-3.jpeg",
  "/images/gallery/loading/loading-4.jpeg",
  "/images/gallery/loading/loading-5.jpeg",
  "/images/gallery/loading/loading-6.jpeg",
    "/images/gallery/loading/loading-7.jpeg",
    "/images/gallery/loading/loading-8.jpeg",
    "/images/gallery/loading/loading-9.jpeg",
    "/images/gallery/loading/loading-10.jpeg",
    "/images/gallery/loading/loading-11.jpeg",
    "/images/gallery/loading/loading-12.jpeg",
    "/images/gallery/loading/loading-15.jpeg",
    "/images/gallery/loading/loading-17.jpeg",
    "/images/gallery/loading/loading-18.jpeg",
    "/images/gallery/outstanding/out-1.jpg",
    "/images/gallery/outstanding/out-2.jpg",
  ];

export default function ImageGallery() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
            Gallery
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            Real Operations
          </h2>

          <p className="mt-4 text-slate-600">
            Photos from our daily freight operations.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[2rem] shadow-lg"
            >
              <Image
                src={image}
                alt={`Loading ${index + 1}`}
                width={700}
                height={500}
                className="h-72 w-full object-cover transition duration-300 hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}