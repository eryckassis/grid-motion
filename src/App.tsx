import { GridMotion } from './components/GridMotion'
import { MouseFollower } from './components/MouseFollower'

export function App() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black">
      <GridMotion />

      <a
        className=" absolute right-8 bottom-4 z-10
          text-xl text-white/50
          transition-colors duration-300
          outline-none
          hover:text-white
          focus-visible:text-white
          focus-visible:ring-2
          focus-visible:ring-white/70
          focus-visible:ring-offset-4
          focus-visible:ring-offset-black
          md:text-[15px]
          "
      ></a>

      <MouseFollower />
    </main>
  )
}
