import prisma from './src/config/prisma';

async function checkData() {
  try {
    const school = await prisma.school.findFirst({
      where: { name: { contains: 'Mlimani' } }
    });
    
    if (!school) {
      console.log(' Mlimani School not found');
      await prisma.$disconnect();
      return;
    }
    
    console.log(' School:', school.name, '(ID:', school.id + ')');
    console.log('');
    
    const users = await prisma.user.count({ where: { schoolId: school.id } });
    const teachers = await prisma.user.count({ where: { schoolId: school.id, role: 'TEACHER' } });
    const principals = await prisma.user.count({ where: { schoolId: school.id, role: 'PRINCIPAL' } });
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    
    const timetables = await prisma.timetable.count({ where: { schoolId: school.id } });
    const attendance = await prisma.attendance.count({ 
      where: { 
        teacher: { schoolId: school.id }
      } 
    });
    const leaves = await prisma.leaveRequest.count({ 
      where: { 
        teacher: { schoolId: school.id }
      } 
    });
    const lessons = await prisma.lesson.count({ 
      where: { 
        timetable: { schoolId: school.id }
      } 
    });
    const substitutes = await prisma.substitute.count({ 
      where: { 
        lesson: { timetable: { schoolId: school.id } }
      } 
    });
    const notifications = await prisma.notification.count({ 
      where: { 
        user: { schoolId: school.id }
      } 
    });
    const holidays = await prisma.schoolHoliday.count({ where: { schoolId: school.id } });
    const audits = await prisma.auditLog.count({ 
      where: { 
        user: { schoolId: school.id }
      } 
    });
    
    console.log('📊 DATA SUMMARY FOR MLIMANI SCHOOL:');
    console.log('');
    console.log('👥 Users:');
    console.log('   Total Users:', users);
    console.log('   Teachers:', teachers);
    console.log('   Principals:', principals);
    console.log('   Admins:', admins);
    console.log('');
    console.log('📅 Timetables:', timetables);
    console.log('✅ Attendance Records:', attendance);
    console.log('🏖️  Leave Requests:', leaves);
    console.log('📚 Lessons:', lessons);
    console.log('🔄 Substitutions:', substitutes);
    console.log('🔔 Notifications:', notifications);
    console.log('🎉 Holidays:', holidays);
    console.log('📝 Audit Logs:', audits);
    console.log('');
    
    if (users === 0) {
      console.log('⚠️  NO DATA FOUND - Need to run seed script!');
    } else if (timetables === 0 || attendance === 0 || lessons === 0) {
      console.log('⚠️  INCOMPLETE DATA - Some features missing data!');
    } else {
      console.log('✅ MLIMANI SCHOOL IS FULLY POPULATED!');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error checking data:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkData();
