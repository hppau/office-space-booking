import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/services/auth/password-service";
import {
  PrismaClient,
  ResourceStatus,
  ResourceType,
  UserRole,
} from "../src/generated/prisma/client";

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing from the .env file.`);
  }

  return value;
}

const adapter = new PrismaPg({
  connectionString: requiredEnvironmentVariable("DIRECT_URL"),
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Starting database seed...");

  const defaultPasswordHash = await hashPassword("Password123!");

  const administrationDepartment = await prisma.department.upsert({
    where: {
      name: "Administration",
    },
    update: {
      isActive: true,
    },
    create: {
      name: "Administration",
      isActive: true,
    },
  });

  const humanResourcesDepartment = await prisma.department.upsert({
    where: {
      name: "Human Resources",
    },
    update: {
      isActive: true,
    },
    create: {
      name: "Human Resources",
      isActive: true,
    },
  });

  const engineeringDepartment = await prisma.department.upsert({
    where: {
      name: "Engineering",
    },
    update: {
      isActive: true,
    },
    create: {
      name: "Engineering",
      isActive: true,
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: {
      email: "admin@officebooking.local",
    },
    update: {
      fullName: "System Administrator",
      employeeCode: "ADM-001",
      role: UserRole.SUPER_ADMIN,
      departmentId: administrationDepartment.id,
      isActive: true,
      passwordHash: defaultPasswordHash,
    },
    create: {
      employeeCode: "ADM-001",
      fullName: "System Administrator",
      email: "admin@officebooking.local",
      role: UserRole.SUPER_ADMIN,
      departmentId: administrationDepartment.id,
      isActive: true,
      passwordHash: defaultPasswordHash,
    },
  });

  const hrUser = await prisma.user.upsert({
    where: {
      email: "hr@officebooking.local",
    },
    update: {
      fullName: "HR Administrator",
      employeeCode: "HR-001",
      role: UserRole.HR,
      departmentId: humanResourcesDepartment.id,
      isActive: true,
      passwordHash: defaultPasswordHash,
    },
    create: {
      employeeCode: "HR-001",
      fullName: "HR Administrator",
      email: "hr@officebooking.local",
      role: UserRole.HR,
      departmentId: humanResourcesDepartment.id,
      isActive: true,
      passwordHash: defaultPasswordHash,
    },
  });

  const manager = await prisma.user.upsert({
    where: {
      email: "manager@officebooking.local",
    },
    update: {
      fullName: "Engineering Manager",
      employeeCode: "MGR-001",
      role: UserRole.MANAGER,
      departmentId: engineeringDepartment.id,
      isActive: true,
      passwordHash: defaultPasswordHash,
    },
    create: {
      employeeCode: "MGR-001",
      fullName: "Engineering Manager",
      email: "manager@officebooking.local",
      role: UserRole.MANAGER,
      departmentId: engineeringDepartment.id,
      isActive: true,
      passwordHash: defaultPasswordHash,
    },
  });

  await prisma.user.upsert({
    where: {
      email: "employee@officebooking.local",
    },
    update: {
      fullName: "Demo Employee",
      employeeCode: "EMP-001",
      role: UserRole.EMPLOYEE,
      departmentId: engineeringDepartment.id,
      managerId: manager.id,
      isActive: true,
      passwordHash: defaultPasswordHash,
    },
    create: {
      employeeCode: "EMP-001",
      fullName: "Demo Employee",
      email: "employee@officebooking.local",
      role: UserRole.EMPLOYEE,
      departmentId: engineeringDepartment.id,
      managerId: manager.id,
      isActive: true,
      passwordHash: defaultPasswordHash,
    },
  });

  const office = await prisma.office.upsert({
    where: {
      name: "Singapore Office",
    },
    update: {
      address: "Singapore",
      timezone: "Asia/Singapore",
      isActive: true,
      createdById: superAdmin.id,
    },
    create: {
      name: "Singapore Office",
      address: "Singapore",
      timezone: "Asia/Singapore",
      isActive: true,
      createdById: superAdmin.id,
    },
  });

  const floor = await prisma.floor.upsert({
    where: {
      officeId_name: {
        officeId: office.id,
        name: "Level 3",
      },
    },
    update: {
      floorNumber: 3,
      isActive: true,
      createdById: hrUser.id,
    },
    create: {
      officeId: office.id,
      name: "Level 3",
      floorNumber: 3,
      isActive: true,
      createdById: hrUser.id,
    },
  });

  const resources = [
    {
      code: "A-01",
      name: "Desk A-01",
      type: ResourceType.DESK,
      status: ResourceStatus.ACTIVE,
      capacity: 1,
      description: "Open working-area desk",
      amenities: ["Monitor", "Power Socket"],
      xPercent: 10,
      yPercent: 20,
    },
    {
      code: "A-02",
      name: "Desk A-02",
      type: ResourceType.DESK,
      status: ResourceStatus.ACTIVE,
      capacity: 1,
      description: "Open working-area desk",
      amenities: ["Monitor", "Docking Station"],
      xPercent: 25,
      yPercent: 20,
    },
    {
      code: "A-03",
      name: "Desk A-03",
      type: ResourceType.DESK,
      status: ResourceStatus.ACTIVE,
      capacity: 1,
      description: "Open working-area desk",
      amenities: ["Power Socket"],
      xPercent: 40,
      yPercent: 20,
    },
    {
      code: "A-04",
      name: "Desk A-04",
      type: ResourceType.DESK,
      status: ResourceStatus.MAINTENANCE,
      capacity: 1,
      description: "Desk temporarily unavailable",
      amenities: ["Monitor"],
      xPercent: 55,
      yPercent: 20,
    },
    {
      code: "M-01",
      name: "Meeting Room M-01",
      type: ResourceType.MEETING_ROOM,
      status: ResourceStatus.ACTIVE,
      capacity: 6,
      description: "Six-person meeting room",
      amenities: ["Projector", "Whiteboard", "Video Conference"],
      xPercent: 15,
      yPercent: 65,
    },
    {
      code: "M-02",
      name: "Meeting Room M-02",
      type: ResourceType.MEETING_ROOM,
      status: ResourceStatus.ACTIVE,
      capacity: 10,
      description: "Ten-person meeting room",
      amenities: ["Television", "Whiteboard", "Video Conference"],
      xPercent: 55,
      yPercent: 65,
    },
  ];

  for (const resource of resources) {
    await prisma.resource.upsert({
      where: {
        code: resource.code,
      },
      update: {
        floorId: floor.id,
        name: resource.name,
        type: resource.type,
        status: resource.status,
        capacity: resource.capacity,
        description: resource.description,
        amenities: resource.amenities,
        xPercent: resource.xPercent,
        yPercent: resource.yPercent,
        widthPercent: 5,
        heightPercent: 5,
        rotation: 0,
        iconName:
          resource.type === ResourceType.MEETING_ROOM
            ? "meeting-room"
            : "desk",
        createdById: hrUser.id,
        isActive: true,
      },
      create: {
        floorId: floor.id,
        code: resource.code,
        name: resource.name,
        type: resource.type,
        status: resource.status,
        capacity: resource.capacity,
        description: resource.description,
        amenities: resource.amenities,
        requiresApproval: true,
        requiresManager: resource.type === ResourceType.MEETING_ROOM,
        xPercent: resource.xPercent,
        yPercent: resource.yPercent,
        widthPercent: 5,
        heightPercent: 5,
        rotation: 0,
        iconName:
          resource.type === ResourceType.MEETING_ROOM
            ? "meeting-room"
            : "desk",
        createdById: hrUser.id,
        isActive: true,
      },
    });
  }

  console.log("Database seed completed successfully.");
  console.log("Created departments, users, office, floor and resources.");
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });