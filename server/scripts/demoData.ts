import type { Language, Priority, Sentiment } from '../src/generated/prisma/client.js'

export const DEMO_PASSWORD = 'demo1234'

export const demoStaff = [
  { name: 'Tanvir Ahmed', email: 'admin@demo.local', role: 'ADMIN' as const },
  { name: 'Rahim Uddin', email: 'rahim@demo.local', role: 'AGENT' as const },
  { name: 'Nadia Islam', email: 'nadia@demo.local', role: 'AGENT' as const },
]

export const demoCustomers = [
  { name: 'Karim Hasan', email: 'karim@demo.local', area: 'Mirpur' },
  { name: 'Tania Sultana', email: 'tania@demo.local', area: 'Mirpur' },
  { name: 'Sumaiya Akter', email: 'sumaiya@demo.local', area: 'Dhanmondi' },
  { name: 'Mehedi Hasan', email: 'mehedi@demo.local', area: 'Dhanmondi' },
  { name: 'Arif Chowdhury', email: 'arif@demo.local', area: 'Uttara' },
  { name: 'Nusrat Jahan', email: 'nusrat@demo.local', area: 'Gulshan' },
  { name: 'Fahim Rahman', email: 'fahim@demo.local', area: 'Mohammadpur' },
  { name: 'Rafiq Islam', email: 'rafiq@demo.local', area: 'Dhanmondi' },
]

export type DemoTicket = {
  title: string
  description: string
  category: string
  priority: Priority
  sentiment: Sentiment
  language: Language
  // what the ai guessed when it differs from the final category
  aiGuess?: string
  resolution?: string
  thread?: [who: 'customer' | 'agent', body: string][]
  summary?: { issue: string; tried: string; currentState: string; nextStep: string }
}

export const demoTickets: DemoTicket[] = [
  {
    title: 'No internet since morning',
    description:
      'My internet has been down since 8am. The router shows a red LOS light. I work from home and need it fixed today.',
    category: 'Connectivity',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    language: 'ENGLISH',
    resolution:
      'Fiber drop cable was cut near the building gate. Technician spliced the cable and service is back.',
    thread: [
      [
        'agent',
        'Sorry for the trouble. A red LOS light usually means the fiber signal is not reaching your router. We are sending a technician.',
      ],
      ['customer', 'Thank you, please send someone soon.'],
      ['agent', 'Our technician fixed a cut cable at your gate. Can you check now?'],
    ],
  },
  {
    title: 'Net nai 2 din dhore',
    description:
      'Vai amar net 2 din dhore kaj korche na. Router restart dichi kintu kono lav hoy nai. Please taratari thik koren.',
    category: 'Connectivity',
    priority: 'HIGH',
    sentiment: 'FRUSTRATED',
    language: 'BANGLISH',
    resolution:
      'ONU was stuck on an old configuration. Reset the ONU remotely and pushed the correct profile.',
    thread: [
      ['agent', 'Apnar connection check korchi, ektu somoy din.'],
      ['agent', 'ONU remotely reset kora hoyeche. Ekhon net cholche kina janaben?'],
      ['customer', 'Haan ekhon cholche, dhonnobad.'],
    ],
  },
  {
    title: 'Very slow speed at night',
    description:
      'Every night after 9pm the speed drops to 1-2 mbps on my 20 mbps package. YouTube keeps buffering. Daytime is fine.',
    category: 'Connectivity',
    priority: 'MEDIUM',
    sentiment: 'NEGATIVE',
    language: 'ENGLISH',
    resolution:
      'Area switch was overloaded at peak hours. Moved the customer to the new switch with more capacity.',
    thread: [
      ['agent', 'We see high usage on your area switch in the evening. We are checking options.'],
      ['customer', 'It happened again yesterday, still slow.'],
      ['agent', 'Thanks for confirming. We have scheduled a move to a new switch tomorrow.'],
      ['customer', 'Okay, I will check tomorrow night.'],
      ['agent', 'The move is done. Please run a speed test tonight after 9pm.'],
      ['customer', 'Getting 19 mbps now at 10pm. Much better.'],
      ['agent', 'Great, we will close this after one more day of monitoring.'],
    ],
    summary: {
      issue: 'Speed drops to 1-2 mbps every night after 9pm on a 20 mbps package.',
      tried:
        'Found the area switch overloaded at peak hours and moved the customer to a new switch.',
      currentState: 'Customer confirmed 19 mbps at 10pm after the move.',
      nextStep: 'Monitor for one more day and close the ticket if speed stays normal.',
    },
  },
  {
    title: 'Bill charged twice this month',
    description:
      'I paid 1200 taka through bKash on the 5th and the same amount was taken again on the 6th. Please refund the extra payment.',
    category: 'Billing',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    language: 'ENGLISH',
    resolution:
      'Duplicate bKash payment confirmed. Extra 1200 taka added as advance for next month as the customer preferred.',
    thread: [
      [
        'agent',
        'We found both payments. Would you like a refund or should we keep it as advance for next month?',
      ],
      ['customer', 'Keep it for next month please.'],
    ],
  },
  {
    title: 'বিল নিয়ে সমস্যা',
    description: 'আমার বিকাশ থেকে এই মাসে দুইবার টাকা কেটেছে। দয়া করে অতিরিক্ত টাকা ফেরত দিন।',
    category: 'Billing',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    language: 'BANGLA',
    resolution: 'Second payment refunded to the same bKash number within 24 hours.',
    thread: [['agent', 'আমরা অতিরিক্ত পেমেন্ট দেখেছি। ২৪ ঘণ্টার মধ্যে টাকা ফেরত দেওয়া হবে।']],
  },
  {
    title: 'Router not turning on',
    description:
      'The router adapter stopped working after a power cut last night. No lights at all on the router.',
    category: 'Hardware',
    priority: 'HIGH',
    sentiment: 'NEUTRAL',
    language: 'ENGLISH',
    aiGuess: 'Connectivity',
    resolution:
      'Power adapter was burnt after the voltage spike. Replaced the adapter, router works again.',
  },
  {
    title: 'Wifi range is very weak',
    description:
      'Wifi signal does not reach my bedroom, only one bar. Can you suggest a better router or an extender?',
    category: 'Hardware',
    priority: 'LOW',
    sentiment: 'NEUTRAL',
    language: 'ENGLISH',
    resolution:
      'Moved the router to the middle of the flat and changed to a less crowded wifi channel. Shared extender options.',
  },
  {
    title: 'Router e lal light jolche',
    description: 'Amar router e lal batti jolche ar net nai. Ki korbo bujhte parchi na.',
    category: 'Hardware',
    priority: 'HIGH',
    sentiment: 'NEGATIVE',
    language: 'BANGLISH',
    aiGuess: 'Connectivity',
    resolution:
      'Loose fiber connector inside the router box. Technician reconnected and cleaned the connector.',
  },
  {
    title: 'Cannot log in to the customer portal',
    description:
      'I forgot my password and the reset OTP never arrives on my phone. I need to download my last invoice.',
    category: 'Account & Login',
    priority: 'MEDIUM',
    sentiment: 'NEUTRAL',
    language: 'ENGLISH',
    resolution: 'Phone number on the account was outdated. Updated the number and the OTP worked.',
  },
  {
    title: 'Password change korte parchi na',
    description:
      'Portal e password change korte gele error dekhacche. Account ta thik kore din please.',
    category: 'Account & Login',
    priority: 'MEDIUM',
    sentiment: 'NEUTRAL',
    language: 'BANGLISH',
  },
  {
    title: 'New connection for my shop',
    description:
      'I want a new connection for my grocery shop in the same building. What packages do you have and when can you install?',
    category: 'New Connection',
    priority: 'LOW',
    sentiment: 'POSITIVE',
    language: 'ENGLISH',
    resolution: 'Installed a 30 mbps business line on the next working day.',
  },
  {
    title: 'House shift korbo',
    description:
      'Ami next month e Mohammadpur theke Dhanmondi shift korbo. Line ta notun basay nite chai.',
    category: 'New Connection',
    priority: 'LOW',
    sentiment: 'NEUTRAL',
    language: 'BANGLISH',
    resolution:
      'Shifting scheduled and completed on the requested date. No extra charge for the same zone.',
  },
  {
    title: 'Upgrade package to 40 mbps',
    description: 'Please upgrade my package from 20 mbps to 40 mbps from next billing cycle.',
    category: 'New Connection',
    priority: 'LOW',
    sentiment: 'POSITIVE',
    language: 'ENGLISH',
    aiGuess: 'Billing',
    resolution: 'Package upgraded to 40 mbps from the next billing cycle.',
  },
  {
    title: 'Office hours on Friday?',
    description: 'Is your customer care office open on Friday? I want to pay my bill in cash.',
    category: 'General Inquiry',
    priority: 'LOW',
    sentiment: 'NEUTRAL',
    language: 'ENGLISH',
    resolution: 'Shared Friday office hours (3pm to 8pm) and the cash payment points.',
  },
  {
    title: 'Whole office has no internet',
    description:
      'All 25 users in our office lost internet at the same time. Our business is stopped. Please treat this as urgent.',
    category: 'Connectivity',
    priority: 'URGENT',
    sentiment: 'FRUSTRATED',
    language: 'ENGLISH',
    resolution:
      'Core switch port failed. Moved the office uplink to a spare port and replaced the faulty module.',
    thread: [
      ['agent', 'We are on it. A network engineer is checking the uplink right now.'],
      ['customer', 'Any update? It has been one hour.'],
      ['agent', 'We found a failed port on our switch and are moving you to a spare one.'],
      ['agent', 'Service should be back now. Please confirm.'],
      ['customer', 'Yes it is working. Please make sure this does not happen again.'],
      ['agent', 'Understood. We replaced the faulty module so it should be stable now.'],
    ],
    summary: {
      issue: 'All 25 users in a business office lost internet at the same time.',
      tried: 'Engineer found a failed core switch port and moved the uplink to a spare port.',
      currentState: 'Service restored and the faulty module was replaced; customer confirmed.',
      nextStep: 'No action needed unless the customer reports another drop.',
    },
  },
  {
    title: 'Connection drops every hour',
    description:
      'The internet disconnects for about 2 minutes every hour. This is the third time I am complaining about this.',
    category: 'Connectivity',
    priority: 'HIGH',
    sentiment: 'FRUSTRATED',
    language: 'ENGLISH',
    thread: [
      [
        'agent',
        'Sorry this is happening again. Can you tell us the exact times of the last drops?',
      ],
      ['customer', '2:05pm, 3:04pm and 4:06pm today.'],
      ['agent', 'Thanks. We will monitor your line for the next 24 hours.'],
    ],
  },
  {
    title: 'Ping beshi game khelte parchi na',
    description: 'Online game khelte gele ping 200+ hoye jay. Age 30-40 thakto. Ektu check koren.',
    category: 'Connectivity',
    priority: 'MEDIUM',
    sentiment: 'NEGATIVE',
    language: 'BANGLISH',
  },
  {
    title: 'Refund for the days without service',
    description:
      'My connection was down for 4 days last week. Will I get any adjustment on this month bill?',
    category: 'Billing',
    priority: 'MEDIUM',
    sentiment: 'NEUTRAL',
    language: 'ENGLISH',
    resolution: 'Adjusted 4 days of service charge on the next bill as per the outage policy.',
  },
  {
    title: 'ইন্টারনেট খুব স্লো',
    description: 'গত তিন দিন ধরে ইন্টারনেট খুব স্লো। ভিডিও কল করা যাচ্ছে না।',
    category: 'Connectivity',
    priority: 'MEDIUM',
    sentiment: 'NEGATIVE',
    language: 'BANGLA',
    resolution:
      'Customer router firmware was outdated. Updated the firmware remotely and speed is normal again.',
  },
  {
    title: 'Cable damaged by construction work',
    description:
      'Construction workers broke the cable outside my house. The wire is hanging from the pole.',
    category: 'Hardware',
    priority: 'HIGH',
    sentiment: 'NEUTRAL',
    language: 'ENGLISH',
    aiGuess: 'Connectivity',
  },
  {
    title: 'Static IP needed for CCTV',
    description:
      'I need a static IP address to view my CCTV cameras from outside. What is the monthly cost?',
    category: 'General Inquiry',
    priority: 'LOW',
    sentiment: 'NEUTRAL',
    language: 'ENGLISH',
    aiGuess: 'New Connection',
  },
  {
    title: 'Payment kore dichi kintu line off',
    description:
      'Bill payment kore dichi gotokal, tobuo line off kore dise. Taka kete nise kintu service nai.',
    category: 'Billing',
    priority: 'URGENT',
    sentiment: 'FRUSTRATED',
    language: 'BANGLISH',
    resolution:
      'Payment was received but not matched to the account. Matched it manually and reactivated the line.',
  },
]

// tickets that were part of the past outage in dhanmondi
export const incidentReports = [
  'Internet down in Dhanmondi 27 since evening, no connection at all.',
  'Net nai Dhanmondi te, sobar line off mone hocche.',
  'No internet since 7pm, neighbours also have no connection.',
  'Connection gone suddenly, router lights look normal but nothing loads.',
]

export const outageReports = [
  ['Internet down', 'No internet since a few minutes, connection is completely down.'],
  ['Net nai', 'Hotat kore net chole gelo, connection nai ekdom.'],
  ['No connection', 'Internet stopped working suddenly, my neighbour also has no internet.'],
  ['Internet not working', 'Connection down, cannot open any website. Router restarted already.'],
  ['Net off', 'Net kaj korche na, connection off hoye ache 10 minute dhore.'],
  ['Internet gone', 'Lost internet connection a few minutes ago, the whole building is down.'],
  ['Connection lost', 'No internet at all right now, please check the area line.'],
]

export const demoRequestModels = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-small-3.2-24b-instruct:free',
]
