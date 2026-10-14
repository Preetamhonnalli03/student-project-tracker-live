
const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');
const formTitle = document.querySelector('#form-title');
const message = document.querySelector('#message');

let projects = [];
let editingId = null;
let hasLoadedSuccessfully = false;
let isLoading = false;
let isMutating = false;

const validStatuses = ['Planned', 'In Progress', 'Completed'];

// Display a message safely.
function showMessage(text) {
  message.textContent = text;
}

// Compare IDs consistently, whether the API returns numbers or strings.
function sameId(firstId, secondId) {
  return String(firstId) === String(secondId);
}

// Handle API responses and provide readable errors.
async function apiRequest(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error(
      'Could not connect to the server. Check that the server is running and try again.'
    );
  }

  const responseText = await response.text();
  let data = null;

  if (responseText.trim() !== '') {
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      data = responseText;
    }
  }

  if (!response.ok) {
    let errorMessage = '';

    if (data && typeof data === 'object') {
      errorMessage = data.message || data.error || '';
    } else if (typeof data === 'string') {
      errorMessage = data;
    }

    throw new Error(
      errorMessage || `Request failed with HTTP ${response.status}.`
    );
  }

  return data;
}

// Check that the API returned a usable project collection.
function isValidProjects(data) {
  if (!Array.isArray(data)) {
    return false;
  }

  const ids = new Set();

  for (const project of data) {
    if (
      project === null ||
      typeof project !== 'object' ||
      Array.isArray(project) ||
      !['string', 'number'].includes(typeof project.id) ||
      String(project.id).trim() === '' ||
      (typeof project.id === 'number' && !Number.isFinite(project.id)) ||
      typeof project.name !== 'string' ||
      project.name.trim() === '' ||
      !validStatuses.includes(project.status)
    ) {
      return false;
    }

    const idKey = String(project.id);

    if (ids.has(idKey)) {
      return false;
    }

    ids.add(idKey);
  }

  return true;
}

// Load the current collection from the API.
async function loadProjects(showLoadingMessage = true) {
  if (showLoadingMessage) {
    showMessage('Loading projects...');
  }

  try {
    const data = await apiRequest('/api/projects');

    if (!isValidProjects(data)) {
      throw new Error('The API returned an invalid project list.');
    }

    projects = data;
    hasLoadedSuccessfully = true;

    // If the project being edited no longer exists, leave Edit mode.
    if (
      editingId !== null &&
      !projects.some(project => sameId(project.id, editingId))
    ) {
      resetForm();
    }

    renderProjects();
    return { ok: true };
  } catch (error) {
    renderProjects();
    return { ok: false, error };
  }
}

// Disable form and list actions while loading or saving.
function updateControls() {
  const disabled = isLoading || isMutating;

  nameInput.disabled = disabled;
  statusInput.disabled = disabled;
  saveButton.disabled = disabled;
  cancelButton.disabled = disabled;

  projectList.querySelectorAll('button').forEach(button => {
    button.disabled = disabled;
  });
}

// Display the projects received from the API.
function renderProjects() {
  projectList.textContent = '';

  for (const project of projects) {
    const item = document.createElement('li');

    const details = document.createElement('span');
    details.textContent = `${project.name} — ${project.status}`;

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Edit';

    editButton.addEventListener('click', () => {
      if (isLoading || isMutating) {
        return;
      }

      editingId = project.id;
      nameInput.value = project.name;
      statusInput.value = project.status;

      saveButton.textContent = 'Save changes';
      cancelButton.textContent = 'Cancel edit';
      cancelButton.hidden = false;
      formTitle.textContent = 'Edit a Project';

      showMessage('Editing project.');
      nameInput.focus();
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';

    deleteButton.addEventListener('click', async () => {
      if (isLoading || isMutating) {
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete "${project.name}"?`
      );

      // Cancelled deletion sends no request.
      if (!confirmed) {
        return;
      }

      await deleteProject(project);
    });

    item.append(details, ' ', editButton, ' ', deleteButton);
    projectList.appendChild(item);
  }

  // A failed initial load must not look like an empty database.
  emptyState.hidden =
    !hasLoadedSuccessfully || projects.length > 0;

  if (!hasLoadedSuccessfully) {
    emptyState.hidden = true;
  }

  updateControls();
}

// Return the form to Add mode.
function resetForm() {
  editingId = null;
  form.reset();

  saveButton.textContent = 'Save Project';
  cancelButton.textContent = 'Cancel';
  cancelButton.hidden = true;
  formTitle.textContent = 'Add a Project';
}

// Refresh the collection after a successful mutation.
async function refreshAfterMutation(successMessage) {
  const result = await loadProjects(false);

  if (result.ok) {
    showMessage(successMessage);
  } else {
    showMessage(
      `The change was saved, but the project list could not be refreshed: ${result.error.message}`
    );
  }
}

// Create a project or save an edit through the API.
form.addEventListener('submit', async event => {
  event.preventDefault();

  if (isLoading || isMutating) {
    return;
  }

  const name = nameInput.value.trim();
  const status = statusInput.value;

  if (!name) {
    nameInput.setCustomValidity('Enter a project name.');
    nameInput.reportValidity();
    nameInput.setCustomValidity('');
    nameInput.focus();
    return;
  }

  if (!validStatuses.includes(status)) {
    showMessage('Please select a valid project status.');
    return;
  }

  const wasEditing = editingId !== null;
  const targetId = editingId;

  if (
    wasEditing &&
    !projects.some(project => sameId(project.id, targetId))
  ) {
    showMessage('The project being edited could not be found.');
    resetForm();
    return;
  }

  const url = wasEditing
    ? `/api/projects/${encodeURIComponent(targetId)}`
    : '/api/projects';

  const method = wasEditing ? 'PUT' : 'POST';

  isMutating = true;
  updateControls();
  showMessage(wasEditing ? 'Saving changes...' : 'Saving project...');

  try {
    await apiRequest(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, status })
    });

    // Reset only after the mutation itself succeeds.
    resetForm();

    await refreshAfterMutation(
      wasEditing ? 'Project updated successfully.' : 'Project added successfully.'
    );
  } catch (error) {
    // Keep the user's input and Edit mode if the request fails.
    showMessage(
      `Could not ${wasEditing ? 'update' : 'add'} project: ${error.message}`
    );
  } finally {
    isMutating = false;
    renderProjects();
  }
});

// Delete a project through the API.
async function deleteProject(project) {
  const wasEditingThisProject =
    editingId !== null && sameId(editingId, project.id);

  isMutating = true;
  updateControls();
  showMessage('Deleting project...');

  try {
    await apiRequest(
      `/api/projects/${encodeURIComponent(project.id)}`,
      { method: 'DELETE' }
    );

    if (wasEditingThisProject) {
      resetForm();
    }

    await refreshAfterMutation('Project deleted successfully.');
  } catch (error) {
    showMessage(`Could not delete project: ${error.message}`);
  } finally {
    isMutating = false;
    renderProjects();
  }
}

// Cancel editing without sending an API request.
cancelButton.addEventListener('click', () => {
  if (isLoading || isMutating) {
    return;
  }

  resetForm();
  showMessage('Editing cancelled. No changes were saved.');
});

// Load the API collection when the page opens.
async function startApp() {
  isLoading = true;
  renderProjects();

  const result = await loadProjects();

  isLoading = false;
  renderProjects();

  if (!result.ok) {
    showMessage(`Could not load projects: ${result.error.message}`);
    return;
  }

  if (projects.length === 0) {
    showMessage('No projects found. Add your first project.');
  } else {
    showMessage('Projects loaded successfully.');
  }
}

startApp();
