import { auth } from "../auth";

const loadingDiv = document.getElementById('loading')!;
const protectedDiv = document.getElementById('protected')!;

auth.subscribe((user, loading) => {
  if (!loading) {
    loadingDiv.classList.remove('hidden');
    protectedDiv.classList.add('hidden');
  } else if (!user) {
    window.location.href = '/';
  } else {
    loadingDiv.classList.add('hidden');
    protectedDiv.classList.remove('hidden');
  }
});

