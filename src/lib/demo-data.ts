export type ChildRecord = {
  id: string;
  fullName: string;
  preferredName?: string;
  room: string;
  guardian: string;
  guardianPhone: string;
  status: "ACTIVE" | "PENDING_DOCS" | "WAITLIST";
  dob: string;
  startDate: string;
  allergies: string;
  medicalNotes: string;
  emergencyNotes: string;
};

export const demoChildren: ChildRecord[] = [
  {
    id: "child-emma-chen",
    fullName: "Emma Chen",
    preferredName: "Emma",
    room: "Preschool A",
    guardian: "Sophia Chen",
    guardianPhone: "(604) 555-0131",
    status: "ACTIVE",
    dob: "2021-03-14",
    startDate: "2025-09-03",
    allergies: "Peanuts",
    medicalNotes: "EpiPen on file",
    emergencyNotes: "Mother first contact",
  },
  {
    id: "child-noah-li",
    fullName: "Noah Li",
    preferredName: "Noah",
    room: "Toddler B",
    guardian: "Kevin Li",
    guardianPhone: "(604) 555-0178",
    status: "ACTIVE",
    dob: "2022-01-09",
    startDate: "2025-10-01",
    allergies: "None",
    medicalNotes: "N/A",
    emergencyNotes: "Grandmother pickup authorized",
  },
  {
    id: "child-mia-wong",
    fullName: "Mia Wong",
    preferredName: "Mia",
    room: "Pre-K",
    guardian: "Lily Wong",
    guardianPhone: "(604) 555-0195",
    status: "PENDING_DOCS",
    dob: "2020-08-22",
    startDate: "2026-04-01",
    allergies: "Egg",
    medicalNotes: "Pending physician form",
    emergencyNotes: "Requires updated immunization record",
  },
  {
    id: "child-ethan-kim",
    fullName: "Ethan Kim",
    preferredName: "Ethan",
    room: "Preschool B",
    guardian: "Grace Kim",
    guardianPhone: "(604) 555-0144",
    status: "WAITLIST",
    dob: "2021-11-30",
    startDate: "2026-06-15",
    allergies: "None",
    medicalNotes: "N/A",
    emergencyNotes: "Waitlist priority - sibling enrolled",
  },
];

export function getChildById(id: string) {
  return demoChildren.find((child) => child.id === id) ?? null;
}


export type AttendanceRecord = {
  id: string;
  childId: string;
  childName: string;
  room: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: "PRESENT" | "ABSENT" | "LATE_PICKUP" | "CHECKED_OUT";
  pickupPerson: string;
};

export const demoAttendance: AttendanceRecord[] = [
  {
    id: "att-001",
    childId: "child-emma-chen",
    childName: "Emma Chen",
    room: "Preschool A",
    date: "2026-03-13",
    checkIn: "8:14 AM",
    checkOut: "",
    status: "PRESENT",
    pickupPerson: "Pending",
  },
  {
    id: "att-002",
    childId: "child-noah-li",
    childName: "Noah Li",
    room: "Toddler B",
    date: "2026-03-13",
    checkIn: "8:31 AM",
    checkOut: "5:42 PM",
    status: "CHECKED_OUT",
    pickupPerson: "Kevin Li",
  },
  {
    id: "att-003",
    childId: "child-mia-wong",
    childName: "Mia Wong",
    room: "Pre-K",
    date: "2026-03-13",
    checkIn: "",
    checkOut: "",
    status: "ABSENT",
    pickupPerson: "—",
  },
  {
    id: "att-004",
    childId: "child-ethan-kim",
    childName: "Ethan Kim",
    room: "Preschool B",
    date: "2026-03-13",
    checkIn: "8:55 AM",
    checkOut: "",
    status: "LATE_PICKUP",
    pickupPerson: "Grace Kim",
  },
]


export type MessageItem = {
  id: string;
  sender: string;
  role: "STAFF" | "PARENT" | "OWNER";
  body: string;
  timestamp: string;
};

export type MessageThread = {
  id: string;
  subject: string;
  childId?: string;
  childName?: string;
  participants: string[];
  lastMessageAt: string;
  unreadCount: number;
  tags: string[];
  messages: MessageItem[];
};

export const demoThreads: MessageThread[] = [
  {
    id: "thread-001",
    subject: "Pickup change for Emma Chen",
    childId: "child-emma-chen",
    childName: "Emma Chen",
    participants: ["Sophia Chen", "Front Desk"],
    lastMessageAt: "2026-03-13 2:10 PM",
    unreadCount: 2,
    tags: ["Pickup", "Urgent"],
    messages: [
      {
        id: "msg-001",
        sender: "Sophia Chen",
        role: "PARENT",
        body: "Hi, Emma's grandfather will pick her up today instead of me.",
        timestamp: "2026-03-13 1:48 PM",
      },
      {
        id: "msg-002",
        sender: "Front Desk",
        role: "STAFF",
        body: "Got it. Please confirm his full name and phone number for our record.",
        timestamp: "2026-03-13 1:56 PM",
      },
      {
        id: "msg-003",
        sender: "Sophia Chen",
        role: "PARENT",
        body: "His name is David Chen, phone is (604) 555-0108.",
        timestamp: "2026-03-13 2:10 PM",
      },
    ],
  },
  {
    id: "thread-002",
    subject: "Attendance reminder for Noah Li",
    childId: "child-noah-li",
    childName: "Noah Li",
    participants: ["Kevin Li", "Toddler B Team"],
    lastMessageAt: "2026-03-13 11:24 AM",
    unreadCount: 0,
    tags: ["Attendance"],
    messages: [
      {
        id: "msg-004",
        sender: "Toddler B Team",
        role: "STAFF",
        body: "Just checking if Noah will arrive after 9:00 AM today.",
        timestamp: "2026-03-13 9:02 AM",
      },
      {
        id: "msg-005",
        sender: "Kevin Li",
        role: "PARENT",
        body: "Yes, slight delay. We should arrive around 9:20 AM.",
        timestamp: "2026-03-13 11:24 AM",
      },
    ],
  },
  {
    id: "thread-003",
    subject: "Mia Wong document follow-up",
    childId: "child-mia-wong",
    childName: "Mia Wong",
    participants: ["Lily Wong", "Admissions"],
    lastMessageAt: "2026-03-12 4:42 PM",
    unreadCount: 1,
    tags: ["Admissions", "Pending Docs"],
    messages: [
      {
        id: "msg-006",
        sender: "Admissions",
        role: "STAFF",
        body: "We still need Mia's physician form before the start date can be finalized.",
        timestamp: "2026-03-12 3:58 PM",
      },
      {
        id: "msg-007",
        sender: "Lily Wong",
        role: "PARENT",
        body: "Understood. I will send the updated form tomorrow morning.",
        timestamp: "2026-03-12 4:42 PM",
      },
    ],
  },
];

export function getThreadById(id: string) {
  return demoThreads.find((thread) => thread.id === id) ?? null;
}


export type InvoiceRecord = {
  id: string;
  invoiceNo: string;
  childId: string;
  childName: string;
  guardian: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  subsidyAmount: number;
  balance: number;
  status: "PAID" | "DUE" | "OVERDUE" | "PARTIAL";
  method: string;
};

export const demoInvoices: InvoiceRecord[] = [
  {
    id: "inv-001",
    invoiceNo: "BC-2026-0301",
    childId: "child-emma-chen",
    childName: "Emma Chen",
    guardian: "Sophia Chen",
    issueDate: "2026-03-01",
    dueDate: "2026-03-05",
    amount: 1450,
    subsidyAmount: 400,
    balance: 0,
    status: "PAID",
    method: "Auto-debit",
  },
  {
    id: "inv-002",
    invoiceNo: "BC-2026-0302",
    childId: "child-noah-li",
    childName: "Noah Li",
    guardian: "Kevin Li",
    issueDate: "2026-03-01",
    dueDate: "2026-03-05",
    amount: 1380,
    subsidyAmount: 0,
    balance: 380,
    status: "PARTIAL",
    method: "E-transfer",
  },
  {
    id: "inv-003",
    invoiceNo: "BC-2026-0303",
    childId: "child-mia-wong",
    childName: "Mia Wong",
    guardian: "Lily Wong",
    issueDate: "2026-03-01",
    dueDate: "2026-03-05",
    amount: 1520,
    subsidyAmount: 500,
    balance: 1020,
    status: "DUE",
    method: "Pending",
  },
  {
    id: "inv-004",
    invoiceNo: "BC-2026-0304",
    childId: "child-ethan-kim",
    childName: "Ethan Kim",
    guardian: "Grace Kim",
    issueDate: "2026-02-01",
    dueDate: "2026-02-05",
    amount: 980,
    subsidyAmount: 0,
    balance: 980,
    status: "OVERDUE",
    method: "Pending",
  },
];

export function getInvoiceById(id: string) {
  return demoInvoices.find((invoice) => invoice.id === id) ?? null;
}
