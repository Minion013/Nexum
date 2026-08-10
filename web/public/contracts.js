import './app-shell.js';
import { authenticatedRequest } from './supabase-auth.js';
import { contractsPresentation } from './contracts-presentation.js';

const error = document.querySelector('#request-error');
const tableBody = document.querySelector('#contract-table-body');
const records = document.querySelector('#contract-records');
const stageFilter = document.querySelector('#stage-filter');
const responsibilityFilter = document.querySelector('#responsibility-filter');
const createForm = document.querySelector('#contract-create-form');
const createStatus = document.querySelector('#contract-create-status');
let contractAccess = { contracts: [] };

function element(tag, text, className) {
  const item = document.createElement(tag);
  if (text) item.textContent = text;
  if (className) item.className = className;
  return item;
}

function contractLink(action) {
  const link = element('a', action.label, 'button');
  link.href = action.href;
  return link;
}

function cell(text) { return element('td', text); }

function renderTable(presentation) {
  if (!presentation.contracts.length) {
    const row = document.createElement('tr');
    const empty = element('td', presentation.emptyMessage, 'empty');
    empty.colSpan = 7;
    row.append(empty);
    tableBody.replaceChildren(row);
    return;
  }
  tableBody.replaceChildren(...presentation.contracts.map(contract => {
    const row = document.createElement('tr');
    const title = document.createElement('td');
    title.append(element('strong', contract.title), element('small', contract.version));
    const stage = document.createElement('td');
    stage.append(element('span', contract.stage, `status ${contract.statusTone}`));
    const action = document.createElement('td');
    action.append(contractLink(contract.action));
    row.append(title, cell(contract.counterparty), cell(contract.responsibility), stage, cell(contract.nextMilestone), cell(contract.lastActivity), action);
    return row;
  }));
}

function recordField(label, value) {
  const field = document.createElement('div');
  field.append(element('span', label, 'label'), element('strong', value));
  return field;
}

function renderRecords(presentation) {
  if (!presentation.contracts.length) {
    records.replaceChildren(element('p', presentation.emptyMessage, 'empty'));
    return;
  }
  records.replaceChildren(...presentation.contracts.map(contract => {
    const record = document.createElement('article');
    record.className = 'record contract-record';
    const heading = document.createElement('div');
    heading.className = 'contract-record-heading';
    heading.append(element('strong', contract.title), element('small', contract.version));
    const stage = element('span', contract.stage, `status ${contract.statusTone}`);
    const action = document.createElement('div');
    action.className = 'contract-record-action';
    action.append(contractLink(contract.action));
    record.append(heading, stage, recordField('Counterparty', contract.counterparty), recordField('Your responsibility', contract.responsibility), recordField('Next milestone', contract.nextMilestone), recordField('Last activity', contract.lastActivity), action);
    return record;
  }));
}

function render() {
  const presentation = contractsPresentation(contractAccess, { stage: stageFilter.value, responsibility: responsibilityFilter.value });
  renderTable(presentation);
  renderRecords(presentation);
}

async function loadContracts() {
  try {
    ({ home: contractAccess } = await authenticatedRequest('/api/home'));
    render();
  } catch (requestError) {
    error.hidden = false;
    error.textContent = requestError.message;
    const presentation = contractsPresentation({ contracts: [] });
    presentation.emptyMessage = 'Reconnect to load your Contracts.';
    renderTable(presentation);
    renderRecords(presentation);
  }
}

stageFilter.addEventListener('change', render);
responsibilityFilter.addEventListener('change', render);
createForm.addEventListener('submit', async event => {
  event.preventDefault();
  createStatus.textContent = 'Creating your Contract Draft…';
  try {
    const formData = new FormData(createForm);
    const { contract } = await authenticatedRequest('/api/contracts', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.get('name'),
        scope: formData.get('scope'),
        counterpartyEmail: formData.get('counterpartyEmail'),
        initiatorResponsibility: formData.get('initiatorResponsibility')
      })
    });
    location.assign(`/contracts/${encodeURIComponent(contract.id)}`);
  } catch (requestError) {
    createStatus.textContent = requestError.message;
  }
});

loadContracts();
