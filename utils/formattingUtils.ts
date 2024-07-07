const formatTimeBalance = (seconds: number): string => {
  const minutes: number = Math.floor(seconds / 60);
  const hours: number = Math.floor(minutes / 60);
  const remainingMinutes: number = minutes % 60;
  if (hours) {
    return `${hours} hours ${remainingMinutes} minutes`;
  } else {
    return `${remainingMinutes} minutes`;
  }
};

export { formatTimeBalance };
