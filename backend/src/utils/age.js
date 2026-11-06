function ageEn(dateNaissance) {
  const n = new Date(dateNaissance);
  const now = new Date();
  let a = now.getFullYear() - n.getFullYear();
  if (now.getMonth() < n.getMonth() || (now.getMonth() === n.getMonth() && now.getDate() < n.getDate())) a -= 1;
  return a;
}

module.exports = { ageEn };
