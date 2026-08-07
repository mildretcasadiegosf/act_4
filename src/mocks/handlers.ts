import { http, HttpResponse } from 'msw';
import { Task } from '../types';
import { Gasto } from '../types';

const API_URL = 'https://api.taskmanager.com';

// ponytail: la "API falsa" es un array en memoria; resetTasks lo limpia entre tests
let tasks: Task[] = [];
let gastos: Gasto[] = [];

export const resetTasks = () => {
  tasks = [];
};

export const resetGastos = () => {
  gastos = [];
};

export const handlers = [
  http.post(`${API_URL}/tasks`, async ({ request }) => {
    const { title } = (await request.json()) as { title: string };
    const task: Task = { id: String(tasks.length + 1), title, status: 'pending' };
    tasks.push(task);
    return HttpResponse.json(task, { status: 201 });
  }),

  http.get(`${API_URL}/tasks`, () => HttpResponse.json(tasks)),

  http.get(`${API_URL}/gastos`, () => HttpResponse.json(gastos)),

  http.post(`${API_URL}/gastos`, async ({ request }) => {
    const gasto = (await request.json()) as Omit<Gasto, 'id'>;
    const nuevoGasto: Gasto = { id: String(gastos.length + 1), ...gasto };
    gastos.push(nuevoGasto);
    return HttpResponse.json(nuevoGasto, { status: 201 });
  }),

  http.delete(`${API_URL}/gastos/:id`, ({ params }) => {
    gastos = gastos.filter((gasto) => gasto.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];

// https://api.taskmanager.com/tasks - POST
/**
{
  {
    id: "234234",
    title: "Tarea 1",
    status: 'pending'
  },
  { status: 201 }
}
*/

// https://api.taskmanager.com/tasks - GET
/**
[
  {
    id: "234234",
    title: "Tarea 1",
    status: 'pending'
  }
]
*/
