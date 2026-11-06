using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Хачатрян_задание9
{
    public partial class Form1 : Form
    {
        static public Record Rec;

        List<Record> Table = new List<Record>();

        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            Table.Add(new Record("Аветисян Карен", new DateTime(1990, 4, 17), "Инженер", "Технический отдел", 68000));
            Table.Add(new Record("Морозова Ольга", new DateTime(1985, 11, 2), "Главный бухгалтер", "Бухгалтерия", 85000));
            Table.Add(new Record("Кравцов Денис", new DateTime(1997, 7, 23), "Программист", "ИТ-отдел", 95000));
            Table.Add(new Record("Лебедева Ирина", new DateTime(1993, 1, 30), "Менеджер", "Отдел продаж", 60000));
            Table.Add(new Record("Григорян Тигран", new DateTime(1979, 9, 9), "Начальник отдела", "Отдел кадров", 78000));
            Redraw();
        }

        public void Redraw()
        {
            dataGridView1.DataSource = null;
            dataGridView1.DataSource = Table;
            dataGridView1.Columns[1].DefaultCellStyle.Format = "dd.MM.yyyy";
            textBox1.Text = "";
        }

        private void dataGridView1_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0)
                return;
            textBox1.Text = Table[e.RowIndex].ToString();
        }

        private void добавитьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            DialogAdd Dialog = new DialogAdd();
            if (Dialog.ShowDialog() == DialogResult.OK)
            {
                Table.Add(Rec);
                Redraw();
            }
        }

        private void изменитьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            if (Table.Count == 0)
                return;
            int current = dataGridView1.CurrentRow.Index;
            Rec = Table[current];
            DialogEdit Dialog = new DialogEdit();
            if (Dialog.ShowDialog() == DialogResult.OK)
            {
                Table[current] = Rec;
                Redraw();
            }
        }

        private void удалитьToolStripMenuItem_Click(object sender, EventArgs e)
        {
            if (Table.Count == 0)
                return;
            int current = dataGridView1.CurrentRow.Index;
            Rec = Table[current];
            var result = MessageBox.Show("Удалить запись?\n" + Rec.ToString(), "Удаление",
                                         MessageBoxButtons.YesNo, MessageBoxIcon.Question);
            if (result == DialogResult.Yes)
            {
                Table.RemoveAt(current);
                Redraw();
            }
        }

        private void поИмениToolStripMenuItem_Click(object sender, EventArgs e)
        {
            Table.Sort((a, b) => a.Name.CompareTo(b.Name));
            Redraw();
        }

        private void поОкладуToolStripMenuItem_Click(object sender, EventArgs e)
        {
            Table.Sort((a, b) => a.Money.CompareTo(b.Money));
            Redraw();
        }

        private void выходToolStripMenuItem_Click(object sender, EventArgs e)
        {
            Close();
        }

        private void toolStrip1_ItemClicked(object sender, ToolStripItemClickedEventArgs e)
        {
            switch (toolStrip1.Items.IndexOf(e.ClickedItem))
            {
                case 0: { добавитьToolStripMenuItem_Click(sender, e); break; }
                case 1: { изменитьToolStripMenuItem_Click(sender, e); break; }
                case 2: { удалитьToolStripMenuItem_Click(sender, e); break; }
            }
        }
    }
}
