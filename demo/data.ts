export const teams = ['Engineering', 'Design', 'Operations', 'Sales', 'Finance', 'Support']
export const locations = ['London', 'Berlin', 'Bengaluru', 'Singapore', 'Dubai', 'New York', 'Sydney', 'Remote']
export const statuses = ['Active', 'On leave', 'Onboarding']
const firstNames = [
  'Ada',
  'Ben',
  'Cleo',
  'Dev',
  'Erin',
  'Farah',
  'Aarav',
  'Mei',
  'Sofia',
  'Noah',
  'Amara',
  'Liam',
  'Yuki',
  'Omar',
  'Isla',
  'Anika',
  'Mateo',
  'Zara',
  'Alex',
  'Priya'
]
const lastNames = [
  'Shah',
  'Chen',
  'Smith',
  'Patel',
  'Garcia',
  'Kim',
  'Wilson',
  'Khan',
  'Martin',
  'Singh',
  'Tan',
  'Brown',
  'Ali',
  'Silva',
  'Roy',
  'Lee',
  'Davis',
  'Sato',
  'Jones',
  'Das',
  'Moore',
  'Park',
  'Wong'
]

export interface Person {
  id: string
  name: string
  email: string
  team: string
  location: string
  status: string
  age: number
  salary: number
  joined: string
  remote: boolean
  projects: number
  skills: string[]
}

export function createPeople(count: number): Person[] {
  // A fixed seed keeps records stable when switching dataset sizes.
  let seed = 42
  const next = (limit: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return Math.floor((seed / 4294967296) * limit)
  }
  return Array.from({length: count}, (_, index) => {
    const first = firstNames[next(firstNames.length)]!
    const last = lastNames[next(lastNames.length)]!
    return {
      id: `person-${index + 1}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${index + 1}@example.com`,
      team: teams[next(teams.length)]!,
      location: locations[next(locations.length)]!,
      status: statuses[next(statuses.length)]!,
      age: 21 + next(45),
      salary: (45 + next(156)) * 1000,
      joined: new Date(Date.UTC(2017 + next(9), next(12), 1 + next(28))).toISOString().slice(0, 10),
      remote: next(2) === 1,
      projects: next(13),
      skills: [teams[index % teams.length]!, teams[(index + 2) % teams.length]!]
    }
  })
}
