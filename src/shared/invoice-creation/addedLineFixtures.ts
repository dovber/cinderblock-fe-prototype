export type AddedLineFixture = {
  name: string
  description: string
  price: number
  qty: number
}

const addedLineFixtures: AddedLineFixture[] = [
  { name: 'Under-cabinet LED lighting', description: 'Supply and install LED under-cabinet lighting, including drivers, wiring, and final testing.', price: 1850, qty: 1 },
  { name: 'Backsplash tile installation', description: 'Install kitchen backsplash tile with grout, edge trim, and final cleanup.', price: 42.5, qty: 80 },
  { name: 'Kitchen trim and finish carpentry', description: 'Provide and install finish trim, scribe molding, and cabinet touch-up work.', price: 2750, qty: 1 },
]

export function addedLineFixture(sequence: number): AddedLineFixture {
  return addedLineFixtures[(sequence - 1) % addedLineFixtures.length]
}
