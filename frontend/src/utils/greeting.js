export const getGreeting = (name = 'User') => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return `Good Morning, ${name} 👋`;
  }

  if (hour >= 12 && hour < 17) {
    return `Good Afternoon, ${name} 👋`;
  }

  if (hour >= 17 && hour < 21) {
    return `Good Evening, ${name} 👋`;
  }

  return `Good Night, ${name} 🌙`;
};

export const getRoleSubtitle = (role) => {
  switch (role) {
    case 'super_admin':
      return "Here's an overview of hospitals across the platform.";
    case 'hr':
      return "Here's your HR workspace.";
    default:
      return "Here's an overview of your hospital.";
  }
};
