import { nanoid } from 'nanoid'

const teamMembers = [
  {
    name: 'Alessandro',
    image:
      'https://res.cloudinary.com/guffenix/image/upload/f_auto,q_auto/v1/avalanx/avatar001',
  },
  {
    name: 'Wolfcito',
    image:
      'https://res.cloudinary.com/guffenix/image/upload/f_auto,q_auto/v1/avalanx/team002',
  },
  {
    name: 'Juan Y.',
    image:
      'https://res.cloudinary.com/guffenix/image/upload/f_auto,q_auto/v1/avalanx/team001',
  },
  {
    name: 'Juan Q.',
    image:
      'https://res.cloudinary.com/guffenix/image/upload/f_auto,q_auto/v1/avalanx/avatar001',
  },
]

export function TeamComponent({
  setIsModalOpen,
}: {
  readonly setIsModalOpen: any
}) {
  return (
    <section className="py-8flex">
      <div className="container mx-auto px-4 text-center w-full max-w-2xl">
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 bg-gray-100 py-2 px-3 rounded-full cursor-pointer"
          onClick={() => setIsModalOpen(false)}
        >
          ✕
        </button>
        <h2 className="text-3xl font-bold mb-6">Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member) => (
            <div key={nanoid()} className="flex flex-col items-center">
              <img
                src={member.image}
                alt={member.name}
                className="w-32 h-32 rounded-full object-cover mb-4"
              />
              <h3 className="text-xl font-semibold">{member.name}</h3>
            </div>
          ))}
        </div>
        <p className="mt-8 text-lg text-gray-700">
          We are transforming the complex into something simple, opening the
          doors to the world and the Web3 community.
        </p>
      </div>
    </section>
  )
}
