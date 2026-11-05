using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Хачатрян_задание4
{
    public partial class Form1 : Form
    {
        Pic myperson = new Pic(200, 100, 80, 1);

        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            // Рисунки для пунктов "Вид" (такие же стоят на пунктах меню).
            imageList1.Images.Add(Properties.Resources.robot);
            imageList1.Images.Add(Properties.Resources.ufo);
            imageList1.Images.Add(Properties.Resources.rocket);

            toolStripComboBox1.SelectedIndex = 1;   // по умолчанию быстро
        }

        // Таймер включен сразу (Enabled = true в свойствах).
        private void timer1_Tick(object sender, EventArgs e)
        {
            myperson.Draw(pictureBox1);
        }

        // ---------- Направление ----------
        private void налевоToolStripMenuItem_Click(object sender, EventArgs e)
        {
            myperson.Dir = 1;
        }

        private void направоToolStripMenuItem_Click(object sender, EventArgs e)
        {
            myperson.Dir = 2;
        }

        private void вверхToolStripMenuItem_Click(object sender, EventArgs e)
        {
            myperson.Dir = 3;
        }

        private void внизToolStripMenuItem_Click(object sender, EventArgs e)
        {
            myperson.Dir = 4;
        }

        // ---------- Вид ----------
        private void роботToolStripMenuItem_Click(object sender, EventArgs e)
        {
            pictureBox1.Image = imageList1.Images[0];
        }

        private void нлоToolStripMenuItem_Click(object sender, EventArgs e)
        {
            pictureBox1.Image = imageList1.Images[1];
        }

        private void ракетаToolStripMenuItem_Click(object sender, EventArgs e)
        {
            pictureBox1.Image = imageList1.Images[2];
        }

        // ---------- Размер ----------
        private void маленькийToolStripMenuItem_Click(object sender, EventArgs e)
        {
            myperson.Size = 60;
        }

        private void большойToolStripMenuItem_Click(object sender, EventArgs e)
        {
            myperson.Size = 120;
        }

        // ---------- Скорость ----------
        private void медленноToolStripMenuItem_Click(object sender, EventArgs e)
        {
            timer1.Interval = 300;
        }

        private void быстроToolStripMenuItem_Click(object sender, EventArgs e)
        {
            timer1.Interval = 100;
        }

        // ---------- Выход ----------
        private void выходToolStripMenuItem_Click(object sender, EventArgs e)
        {
            Close();
        }

        // Контекстное меню картинки повторяет пункты меню "Вид".
        private void роботToolStripMenuItem1_Click(object sender, EventArgs e)
        {
            роботToolStripMenuItem_Click(sender, e);
        }

        private void нлоToolStripMenuItem1_Click(object sender, EventArgs e)
        {
            нлоToolStripMenuItem_Click(sender, e);
        }

        private void ракетаToolStripMenuItem1_Click(object sender, EventArgs e)
        {
            ракетаToolStripMenuItem_Click(sender, e);
        }

        // Один обработчик на всю панель инструментов, кнопки вызывают пункты меню.
        private void toolStrip1_ItemClicked(object sender, ToolStripItemClickedEventArgs e)
        {
            switch (toolStrip1.Items.IndexOf(e.ClickedItem))
            {
                case 0: { налевоToolStripMenuItem_Click(sender, e); break; }
                case 1: { вверхToolStripMenuItem_Click(sender, e); break; }
                case 2: { направоToolStripMenuItem_Click(sender, e); break; }
                case 3: { внизToolStripMenuItem_Click(sender, e); break; }
            }
        }

        // Выпадающий список скорости на панели тоже вызывает пункты меню.
        private void toolStripComboBox1_SelectedIndexChanged(object sender, EventArgs e)
        {
            switch (toolStripComboBox1.SelectedIndex)
            {
                case 0: { медленноToolStripMenuItem_Click(sender, e); break; }
                case 1: { быстроToolStripMenuItem_Click(sender, e); break; }
            }
        }
    }
}
